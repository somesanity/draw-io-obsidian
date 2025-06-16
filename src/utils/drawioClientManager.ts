import { App, Notice, Vault, PluginManifest, requestUrl } from 'obsidian';
import JSZip from 'jszip';

export class DrawioClientManager {
    private app: App;
    private vault: Vault;
    private manifest: PluginManifest;
    private pluginName: string;

    private static installationPromise: Promise<void> | null = null;

    constructor(app: App, manifest: PluginManifest) {
        this.app = app;
        this.vault = app.vault;
        this.manifest = manifest;
        this.pluginName = manifest.name;
    }

    public async checkAndUnzipDrawioClient(drawioClientZipUrl: string): Promise<void> {
        if (DrawioClientManager.installationPromise) {
            console.log(`[${this.pluginName}] Процесс установки draw.io клиента уже запущен, ожидаем завершения...`);
            return DrawioClientManager.installationPromise;
        }

        console.log(`[${this.pluginName}] Запускается первичная проверка и установка клиента draw.io...`);
        DrawioClientManager.installationPromise = this._runInstallationProcess(drawioClientZipUrl);
        DrawioClientManager.installationPromise.catch(error => {
            console.error(`[${this.pluginName}] Произошла ошибка в процессе установки, замок сброшен.`, error.message);
            DrawioClientManager.installationPromise = null;
        });

        return DrawioClientManager.installationPromise;
    }

    private async _runInstallationProcess(drawioClientZipUrl: string): Promise<void> {
        if (!drawioClientZipUrl) {
            throw new Error("URL для скачивания не предоставлен.");
        }

        if (!this.manifest.dir) {
            throw new Error("Не удалось определить директорию плагина.");
        }

        const pluginBaseDir = this.manifest.dir;
        const drawioClientExpectedPath = `${pluginBaseDir}/drawioclient`;
        const webappExpectedPath = `${pluginBaseDir}/webapp`;
        const drawioClientZipPath = `${pluginBaseDir}/drawioclient.zip`;
        
        try {
            const drawioClientFolderExists = await this.vault.adapter.exists(drawioClientExpectedPath) && 
                                             (await this.vault.adapter.stat(drawioClientExpectedPath))?.type === 'folder';
            const webappFolderExists = await this.vault.adapter.exists(webappExpectedPath) && 
                                       (await this.vault.adapter.stat(webappExpectedPath))?.type === 'folder';

            if (drawioClientFolderExists || webappFolderExists) {
                console.log(`[${this.pluginName}] Папка 'drawioclient' или 'webapp' уже существует. Установка не требуется.`);
                if (await this.vault.adapter.exists(drawioClientZipPath)) {
                    await this.vault.adapter.remove(drawioClientZipPath);
                }
                return;
            }
            
            const startNotice = new Notice(`${this.pluginName}: Начинается скачивание клиента draw.io...`, 0);

            console.log(`${this.pluginName}: Скачивание drawioclient.zip с: ${drawioClientZipUrl}`);
            const response = await requestUrl({ url: drawioClientZipUrl });
            if (response.status !== 200) throw new Error(`Ошибка сети: ${response.status}`);
            await this.vault.adapter.writeBinary(drawioClientZipPath, response.arrayBuffer);
            console.log(`${this.pluginName}: drawioclient.zip успешно скачан.`);
            
            startNotice.setMessage(`${this.pluginName}: Распаковка архива...`);
            const zipFileData = await this.vault.adapter.readBinary(drawioClientZipPath);
            const zip = await JSZip.loadAsync(zipFileData);

            for (const relativePath in zip.files) {
                const zipEntry = zip.files[relativePath];
                if (zipEntry.dir) {
                    await this.vault.adapter.mkdir(`${pluginBaseDir}/${relativePath}`);
                } else {
                    const fileData = await zipEntry.async("uint8array");
                    await this.vault.adapter.writeBinary(`${pluginBaseDir}/${relativePath}`, fileData.buffer as ArrayBuffer);
                }
            }

            startNotice.hide();
            new Notice(`${this.pluginName}: Клиент draw.io успешно установлен!`, 5000);
            console.log(`[${this.pluginName}] Клиент draw.io успешно установлен и распакован.`);

        } catch (error: any) {
            console.error(`[${this.pluginName}] Критическая ошибка при установке 'drawioclient':`, error);
            new Notice(`${this.pluginName}: Ошибка установки drawioclient: ${error.message}`, 8000);
            throw error;
        } finally {
            if (await this.vault.adapter.exists(drawioClientZipPath)) {
                console.log(`[${this.pluginName}] Удаление временного файла drawioclient.zip.`);
                await this.vault.adapter.remove(drawioClientZipPath);
            }
        }
    }
}
