import { DRAWIO_CLIENT_DOWNLOADING_LINK, DRAWIO_CLIENT_LAST_RELEASE } from "consts";
import DrawioPlugin from "main";
import { Notice, requestUrl, Setting, ButtonComponent } from 'obsidian';
import JSZip from "jszip";
import * as http from 'https';

export class DrawioClientManager {
    private plugin: DrawioPlugin;
    private isUpdating: boolean = false;

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin;
    }

    public initDelayedCheck(delayMs: number = 5000) {
        if (this.plugin.settings.clientAutoUpdate === false) {
            console.log("[Drawio] Фоновая проверка обновлений пропущена (отключено в настройках).");
            return;
        }
        setTimeout(async () => {
            await this.checkAndUpdate();
        }, delayMs);
    }

    public async checkAndUpdate() {
        if (this.isUpdating) return;

        if (this.plugin.settings.clientAutoUpdate === false) {
            return;
        }

        try {
            const isUpdate = await this.compareVersions();
            const folderIsExist = await this.plugin.app.vault.adapter.exists(`${this.plugin.manifest.dir}/webapp`);
            if (isUpdate && folderIsExist) {
                return;
            }

            let lastLoggedPercentage = -1;
            await this.executeUpgrade((progress) => {
                if (progress % 10 === 0 && progress !== lastLoggedPercentage) {
                    console.log(`[Drawio Auto-Update] Загрузка: ${progress}%`);
                    lastLoggedPercentage = progress;
                }
            });
        } catch (error) {
            console.error("[Drawio] Ошибка авто-обновления:", error);
        }
    }

    public async forceUpdateManual(onProgress: (percentage: number, status: string) => void): Promise<boolean> {
        if (this.isUpdating) {
            new Notice("Процесс обновления уже запущен!");
            return false;
        }
        try {
            await this.executeUpgrade(onProgress);
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    public async createUpdateSetting(containerEl: HTMLElement): Promise<void> {
        const updateSetting = new Setting(containerEl)
            .setName("Обновление клиента draw.io вручную")
            .setDesc("Получение информации о версиях...");

        const statusSpan = updateSetting.descEl.createSpan({
            text: "",
            cls: "drawio-update-status"
        });
        statusSpan.style.marginLeft = "10px";
        statusSpan.style.fontWeight = "bold";
        statusSpan.style.color = "var(--text-accent)";

        let updateButton: ButtonComponent | null = null;
        updateSetting.addButton((button: ButtonComponent) => {
            updateButton = button;
            updateButton
                .setButtonText("Проверка...")
                .setCta()
                .setDisabled(true);
        });

        const currentVersion = this.plugin.settings.currentlyDrawioClientVersion || "Не установлена";
        let targetVersion: string | null = null;

        try {
            targetVersion = await this.getLastVersion() || null;
        } catch (e) {
            console.error(e);
        }

        const refreshUiText = (versionInstalled: string, versionAvailable: string | null) => {
            if (!versionAvailable) {
                updateSetting.setDesc(`Текущая версия: ${versionInstalled}. Не удалось проверить обновления.`);
                updateButton?.setButtonText("Обновить принудительно");
            } else if (versionInstalled === versionAvailable) {
                updateSetting.setDesc(`У вас установлена актуальная версия: ${versionInstalled}. Обновление не требуется.`);
                updateButton?.setButtonText("Переустановить");
            } else {
                updateSetting.setDesc(`Доступно обновление! Текущая версия: ${versionInstalled} ➔ Будет установлена: ${versionAvailable}`);
                updateButton?.setButtonText("Обновить");
            }
            updateSetting.descEl.appendChild(statusSpan);
        };

        refreshUiText(currentVersion, targetVersion);
        updateButton!.setDisabled(false);

        updateButton!.onClick(async () => {
            updateButton!.setDisabled(true);

            const success = await this.forceUpdateManual((percentage, status) => {
                updateButton!.setButtonText(percentage > 0 && percentage < 100 ? `Скачивание... ${percentage}%` : "Обработка...");
                statusSpan.setText(` [${status}]`);
            });

            updateButton!.setDisabled(false);

            if (success) {
                statusSpan.setText(" Выполнено успешно!");
                statusSpan.style.color = "var(--text-success)";

                const newVersion = targetVersion || currentVersion;
                refreshUiText(newVersion, targetVersion);
            } else {
                statusSpan.setText(" Ошибка скачивания. См. консоль.");
                statusSpan.style.color = "var(--text-error)";
                updateButton!.setButtonText("Повторить попытку");
            }

            setTimeout(() => { statusSpan.setText(""); }, 5000);
        });
    }

    private async executeUpgrade(onProgress?: (percentage: number, status: string) => void) {
        this.isUpdating = true;
        try {
            await this.downloadWithSystemStream(onProgress);
            if (onProgress) onProgress(100, "Распаковка...");
            await this.unzipDrawioClient();

            const lastVersion = await this.getLastVersion();
            if (lastVersion) {
                this.plugin.settings.currentlyDrawioClientVersion = lastVersion;
                await this.plugin.saveSettings();
            }
        } finally {
            this.isUpdating = false;
        }
    }

    private downloadWithSystemStream(onProgress?: (percentage: number, status: string) => void): Promise<void> {
        return new Promise((resolve, reject) => {
            const pluginBaseDir = this.plugin.manifest.dir;
            const adapter = this.plugin.app.vault.adapter;
            // @ts-ignore
            const basePath = adapter.getBasePath ? adapter.getBasePath() : "";
            const absoluteZipPath = `${basePath}/${pluginBaseDir}/webapp.zip`;

            const fs = require('fs');
            const fileStream = fs.createWriteStream(absoluteZipPath);

            if (onProgress) onProgress(0, "Подключение...");

            const makeRequest = (url: string) => {
                http.get(url, {
                    headers: {
                        'User-Agent': 'Obsidian-Plugin-CheckUpdate',
                        'Accept': 'application/vnd.github+json'
                    }
                }, (response) => {
                    if (response.statusCode === 301 || response.statusCode === 302) {
                        if (response.headers.location) {
                            makeRequest(response.headers.location);
                            return;
                        }
                    }

                    if (response.statusCode !== 200) {
                        reject(new Error(`Сервер вернул ошибку: ${response.statusCode}`));
                        return;
                    }

                    const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
                    let receivedBytes = 0;

                    response.on('data', (chunk: Uint8Array) => {
                        receivedBytes += chunk.length;
                        if (totalBytes > 0 && onProgress) {
                            const percentage = Math.round((receivedBytes / totalBytes) * 100);
                            onProgress(percentage, `Скачивание: ${percentage}%`);
                        } else if (onProgress) {
                            const mb = (receivedBytes / (1024 * 1024)).toFixed(2);
                            onProgress(0, `Скачано: ${mb} MB`);
                        }
                    });

                    response.pipe(fileStream);

                    fileStream.on('finish', () => {
                        fileStream.close();
                        resolve();
                    });

                }).on('error', (err) => {
                    fs.unlink(absoluteZipPath, () => { });
                    reject(err);
                });
            };

            makeRequest(DRAWIO_CLIENT_DOWNLOADING_LINK);
        });
    }

    public async getLastVersion(): Promise<string | void> {
        try {
            const response = await requestUrl({
                url: DRAWIO_CLIENT_LAST_RELEASE,
                method: 'GET',
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'User-Agent': 'Obsidian-Plugin-CheckUpdate',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            return response.json.tag_name;
        } catch (error) {
            console.error("Не удалось узнать версию", error);
        }
    }

    private async compareVersions(): Promise<boolean> {
        try {
            const lastVersion = await this.getLastVersion();
            const currentlyVersion = this.plugin.settings.currentlyDrawioClientVersion;
            if (!lastVersion) return false;
            return currentlyVersion === lastVersion;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    private async unzipDrawioClient() {
        try {
            const pluginBaseDir = this.plugin.manifest.dir;
            const drawioClientZipPath = `${pluginBaseDir}/webapp.zip`;
            const adapter = this.plugin.app.vault.adapter;

            if (!(await adapter.exists(drawioClientZipPath))) {
                throw new Error(`Файл ${drawioClientZipPath} не найден!`);
            }

            const zipBuffer = await adapter.readBinary(drawioClientZipPath);
            const zip = await JSZip.loadAsync(zipBuffer);
            const RootFolderInZip = Object.keys(zip.files)[0];
            if (!RootFolderInZip) throw new Error("zip is empty.");

            const rootDirInZip = RootFolderInZip.split('/')[0];
            const webappFolder = `${rootDirInZip}/src/main/webapp/`;

            for (const relativePath in zip.files) {
                if (relativePath.startsWith(webappFolder) && relativePath !== webappFolder) {
                    const zipEntry = zip.files[relativePath];
                    const cleanSubPath = relativePath.substring(webappFolder.length);
                    const fullPathOnDisk = `${pluginBaseDir}/webapp/${cleanSubPath}`;

                    if (zipEntry!.dir) {
                        if (!(await adapter.exists(fullPathOnDisk))) await adapter.mkdir(fullPathOnDisk);
                    } else {
                        const fileData = await zipEntry!.async("uint8array");
                        const parentDir = fullPathOnDisk.substring(0, fullPathOnDisk.lastIndexOf('/'));
                        if (!(await adapter.exists(parentDir))) await adapter.mkdir(parentDir);
                        await adapter.writeBinary(fullPathOnDisk, fileData.buffer as ArrayBuffer);
                    }
                }
            }
            if (await adapter.exists(drawioClientZipPath)) await adapter.remove(drawioClientZipPath);
        } catch (error) {
            console.error(`[Drawio КРИТИЧЕСКАЯ ОШИБКА]:`, error);
            new Notice(`Критическая ошибка при распаковке.`);
            throw error;
        }
    }
}