import { App, Notice, Vault, PluginManifest, requestUrl } from 'obsidian';
import JSZip from 'jszip';
import { t } from 'locales/i18n';

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

    public async checkAndUnzipDrawioClient(): Promise<void> {
        if (DrawioClientManager.installationPromise) {
            console.log(`[${this.pluginName}] The draw.io client installation process is already running. Waiting for it to finish...`);
            return DrawioClientManager.installationPromise;
        }

        const drawioClientZipUrl = `https://github.com/somesanity/draw-io-obsidian/releases/download/${this.manifest.version}/webapp.zip`;
                
        DrawioClientManager.installationPromise = this._runInstallationProcess(drawioClientZipUrl);
        
        DrawioClientManager.installationPromise.catch(error => {
            DrawioClientManager.installationPromise = null;
        });

        return DrawioClientManager.installationPromise;
    }

    private async _runInstallationProcess(drawioClientZipUrl: string): Promise<void> {
        if (!drawioClientZipUrl) {
            throw new Error("No download URL provided.");
        }

        if (!this.manifest.dir) {
            throw new Error("Failed to determine plugin directory.");
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
                if (await this.vault.adapter.exists(drawioClientZipPath)) {
                    await this.vault.adapter.remove(drawioClientZipPath);
                }
                return;
            }
            
            const startNotice = new Notice(`${this.pluginName}: ${t('StartDownladDrawioApp')}`, 0);

            const response = await requestUrl({ url: drawioClientZipUrl });
            if (response.status !== 200) throw new Error(`Network error: ${response.status}`);
            await this.vault.adapter.writeBinary(drawioClientZipPath, response.arrayBuffer);

            startNotice.setMessage(`${this.pluginName}: ${t('ExtractingArchive')}`);
            const zipFileData = await this.vault.adapter.readBinary(drawioClientZipPath);
            const zip = await JSZip.loadAsync(zipFileData);

            for (const relativePath in zip.files) {
                const zipEntry = zip.files[relativePath];
                const fullPath = `${pluginBaseDir}/${relativePath}`;
                if (zipEntry.dir) {
                    await this.vault.adapter.mkdir(fullPath);
                } else {
                    const fileData = await zipEntry.async("uint8array");
                    await this.vault.adapter.writeBinary(fullPath, fileData.buffer as ArrayBuffer);
                }
            }

            startNotice.hide();
            new Notice(`${this.pluginName}: ${t('DrawioClientsuccessfullyDownload')}`, 5000);

        } catch (error: any) {
            new Notice(`${this.pluginName}: ${t('FailedInstallDrawioClient')} ${error.message}`, 8000);
            console.error(`[${this.pluginName}] Critical error during draw.io client installation:`, error);
            throw error;
        } finally {
            if (await this.vault.adapter.exists(drawioClientZipPath)) {
                await this.vault.adapter.remove(drawioClientZipPath);
            }
        }
    }
}