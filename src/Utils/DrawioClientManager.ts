import { DRAWIO_CLIENT_DOWNLOADING_LINK, DRAWIO_CLIENT_LAST_RELEASE } from "consts";
import DrawioPlugin from "main";
import { Notice, requestUrl, Setting, ButtonComponent } from 'obsidian';
import * as fflate from "fflate";
import * as http from 'https';
import { t } from "locales/I18n";

export class DrawioClientManager {
    private plugin: DrawioPlugin;
    private isUpdating: boolean = false;

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin;
    }

    public initDelayedCheck(delayMs: number = 5000) {
        if (this.plugin.settings.clientAutoUpdate === false) {
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
                    console.log(`[Drawio Auto-Update] ${t("DRAWIO_UPDATE__PROCESSING").replace("...", "")}: ${progress}%`);
                    lastLoggedPercentage = progress;
                }
            });
        } catch (error) {
            console.error(t("DRAWIO_LOG__AUTO_UPDATE_ERROR"), error);
        }
    }

    public async forceUpdateManual(onProgress: (percentage: number, status: string) => void): Promise<boolean> {
        if (this.isUpdating) {
            new Notice(t("DRAWIO_NOTICE__ALREADY_RUNNING"));
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
            .setName(t("DRAWIO_UPDATE__SETTING_NAME"))
            .setDesc(t("DRAWIO_UPDATE__GETTING_INFO"));

        const statusSpan = updateSetting.descEl.createSpan({
            text: "",
            cls: "drawio-update-status"
        });

        let updateButton!: ButtonComponent;

        updateSetting.addButton((button: ButtonComponent) => {
            updateButton = button;
            button
                .setButtonText(t("DRAWIO_UPDATE__CHECKING"))
                .setCta()
                .setDisabled(true);
        });

        const currentVersion = this.plugin.settings.currentlyDrawioClientVersion || t("DRAWIO_VERSION__NOT_INSTALLED");
        let targetVersion: string | null = null;

        try {
            targetVersion = await this.getLastVersion() || null;
        } catch (e) {
            console.error(e);
        }

        const refreshUiText = (versionInstalled: string, versionAvailable: string | null) => {
            if (!versionAvailable) {
                updateSetting.setDesc(t("DRAWIO_VERSION__FAILED_CHECK").replace("{installed}", versionInstalled));
                updateButton.setButtonText(t("DRAWIO_UPDATE__FORCE"));
            } else if (versionInstalled === versionAvailable) {
                updateSetting.setDesc(t("DRAWIO_VERSION__ACTUAL").replace("{installed}", versionInstalled));
                updateButton.setButtonText(t("DRAWIO_UPDATE__REINSTALL"));
            } else {
                updateSetting.setDesc(
                    t("DRAWIO_VERSION__AVAILABLE")
                        .replace("{installed}", versionInstalled)
                        .replace("{available}", versionAvailable)
                );
                updateButton.setButtonText(t("DRAWIO_UPDATE__UPGRADE"));
            }
            updateSetting.descEl.appendChild(statusSpan);
        };

        refreshUiText(currentVersion, targetVersion);

        updateButton.setDisabled(false);

        updateButton.onClick(async () => {
            updateButton.setDisabled(true);

            const success = await this.forceUpdateManual((percentage, status) => {
                const btnText = percentage > 0 && percentage < 100
                    ? t("DRAWIO_UPDATE__DOWNLOADING").replace("{progress}", percentage.toString())
                    : t("DRAWIO_UPDATE__PROCESSING");
                updateButton.setButtonText(btnText);
                statusSpan.setText(` [${status}]`);
            });

            updateButton.setDisabled(false);

            if (success) {
                statusSpan.setText(t("DRAWIO_UPDATE__SUCCESS"));
                statusSpan.addClass("drawio-update-status--success");

                const newVersion = targetVersion || currentVersion;
                refreshUiText(newVersion, targetVersion);
            } else {
                statusSpan.setText(t("DRAWIO_UPDATE__ERROR"));
                statusSpan.addClass("drawio-update-status--error");
                updateButton.setButtonText(t("DRAWIO_UPDATE__RETRY"));
            }

            setTimeout(() => { statusSpan.setText(""); }, 5000);
        });
    }

    private async executeUpgrade(onProgress?: (percentage: number, status: string) => void) {
        this.isUpdating = true;
        try {
            await this.downloadWithSystemStream(onProgress);
            if (onProgress) onProgress(100, t("DRAWIO_UPDATE__UNPACKING"));
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

            const basePath = (adapter as any).getBasePath?.() ?? "";
            const absoluteZipPath = `${basePath}/${pluginBaseDir}/webapp.zip`;

            const fs = require('fs');
            const fileStream = fs.createWriteStream(absoluteZipPath);

            if (onProgress) onProgress(0, t("DRAWIO_UPDATE__CONNECTING"));

            const makeRequest = (url: string) => {
                http.get(url, {
                    headers: {
                        'User-Agent': 'obsidian-draw.io-plugin-CheckUpdate-and-update',
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
                        reject(new Error(`${t("DRAWIO_ERROR__SERVER_STATUS")} ${response.statusCode}`));
                        return;
                    }

                    const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
                    let receivedBytes = 0;

                    response.on('data', (chunk: Uint8Array) => {
                        receivedBytes += chunk.length;
                        if (totalBytes > 0 && onProgress) {
                            const percentage = Math.round((receivedBytes / totalBytes) * 100);
                            onProgress(percentage, `${t("DRAWIO_UPDATE__PROCESSING").replace("...", "")}: ${percentage}%`);
                        } else if (onProgress) {
                            const mb = (receivedBytes / (1024 * 1024)).toFixed(2);
                            onProgress(0, `${t("DRAWIO_UPDATE__DOWNLOADED_MB")} ${mb} MB`);
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
                    'User-Agent': 'obsidian-draw.io-plugin-CheckUpdate',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            return response.json?.tag_name;
        } catch (error) {
            console.error(t("DRAWIO_ERROR__FETCH_VERSION_FAILED"), error);
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
                throw new Error(t("DRAWIO_ERROR__ZIP_NOT_FOUND").replace("{path}", drawioClientZipPath));
            }

            const zipBuffer = await adapter.readBinary(drawioClientZipPath);
            const zipData = new Uint8Array(zipBuffer);

            const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
                fflate.unzip(zipData, (err, unzipped) => {
                    if (err) {
                        reject(err);
                    } else if (unzipped) {
                        resolve(unzipped);
                    } else {
                        reject(new Error("Unzipped data is empty or undefined"));
                    }
                });
            });

            const filePaths = Object.keys(files);
            const firstFilePath = filePaths[0];

            if (!firstFilePath) throw new Error("zip is empty.");

            const rootDirInZip = firstFilePath.split('/')[0];
            const webappFolder = `${rootDirInZip}/src/main/webapp/`;

            for (const relativePath of filePaths) {
                if (relativePath.startsWith(webappFolder) && relativePath !== webappFolder) {
                    const fileData = files[relativePath];

                    if (!fileData) continue;

                    const cleanSubPath = relativePath.substring(webappFolder.length);
                    const fullPathOnDisk = `${pluginBaseDir}/webapp/${cleanSubPath}`;

                    if (relativePath.endsWith('/')) {
                        if (!(await adapter.exists(fullPathOnDisk))) await adapter.mkdir(fullPathOnDisk);
                    } else {
                        const parentDir = fullPathOnDisk.substring(0, fullPathOnDisk.lastIndexOf('/'));
                        if (!(await adapter.exists(parentDir))) await adapter.mkdir(parentDir);

                        const safeArrayBuffer = fileData.buffer.slice(
                            fileData.byteOffset,
                            fileData.byteOffset + fileData.byteLength
                        ) as ArrayBuffer;

                        await adapter.writeBinary(fullPathOnDisk, safeArrayBuffer);
                    }
                }
            }
            if (await adapter.exists(drawioClientZipPath)) await adapter.remove(drawioClientZipPath);
        } catch (error) {
            console.error(t("DRAWIO_LOG__CRITICAL_ERROR"), error);
            new Notice(t("DRAWIO_NOTICE__UNZIP_ERROR"));
            throw error;
        }
    }
}