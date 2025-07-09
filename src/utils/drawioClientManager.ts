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

    public async checkAndUnzipDrawioClient(): Promise<void> {
        if (DrawioClientManager.installationPromise) {
            console.log(`[${this.pluginName}] The draw.io client installation process is already running. Waiting for it to finish...`);
            return DrawioClientManager.installationPromise;
        }

        const drawioClientZipUrl = `https://github.com/somesanity/draw-io-obsidian/releases/download/${this.manifest.version}/webapp.zip`;
        
        console.log(`[${this.pluginName}] Starting initial check and installation of the draw.io client...`);
        
        DrawioClientManager.installationPromise = this._runInstallationProcess(drawioClientZipUrl);
        
        DrawioClientManager.installationPromise.catch(error => {
            console.error(`[${this.pluginName}] An error occurred during installation. Lock has been reset.`, error.message);
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
                console.log(`[${this.pluginName}] 'drawioclient' or 'webapp' folder already exists. Installation is not required.`);
                if (await this.vault.adapter.exists(drawioClientZipPath)) {
                    await this.vault.adapter.remove(drawioClientZipPath);
                }
                return;
            }
            
            const startNotice = new Notice(`${this.pluginName}: Starting draw.io client download...`, 0);

            console.log(`${this.pluginName}: Downloading draw.io client from: ${drawioClientZipUrl}`);
            const response = await requestUrl({ url: drawioClientZipUrl });
            if (response.status !== 200) throw new Error(`Network error: ${response.status}`);
            await this.vault.adapter.writeBinary(drawioClientZipPath, response.arrayBuffer);
            console.log(`${this.pluginName}: Client downloaded successfully.`);
            
            startNotice.setMessage(`${this.pluginName}: Extracting archive...`);
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
            new Notice(`${this.pluginName}: draw.io client installed successfully!`, 5000);
            console.log(`[${this.pluginName}] draw.io client successfully installed and extracted.`);

        } catch (error: any) {
            console.error(`[${this.pluginName}] Critical error during draw.io client installation:`, error);
            new Notice(`${this.pluginName}: Failed to install draw.io client: ${error.message}`, 8000);
            throw error;
        } finally {
            if (await this.vault.adapter.exists(drawioClientZipPath)) {
                console.log(`[${this.pluginName}] Removing temporary file.`);
                await this.vault.adapter.remove(drawioClientZipPath);
            }
        }
    }
}