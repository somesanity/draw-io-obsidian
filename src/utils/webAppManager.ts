import { App, Notice, Vault, PluginManifest, TFile } from 'obsidian';
import JSZip from 'jszip';

export class WebappManager {
    private app: App;
    private vault: Vault;
    private manifest: PluginManifest;
    private pluginName: string;

    constructor(app: App, manifest: PluginManifest) {
        this.app = app;
        this.vault = app.vault;
        this.manifest = manifest;
        this.pluginName = manifest.name;
    }

    private async _ensureDirectory(dirPath: string): Promise<void> {
        const normalizedPath = dirPath.split('/').filter(s => s.length > 0);
        let cumulativePath = "";

        for (const segment of normalizedPath) {
            if (cumulativePath === "") {
                cumulativePath = segment;
            } else {
                cumulativePath += "/" + segment;
            }

            if (await this.vault.adapter.exists(cumulativePath)) {
                const stat = await this.vault.adapter.stat(cumulativePath);
                if (stat && stat.type === 'file') {
                    throw new Error(`[${this.pluginName}] Path exists but is a file: ${cumulativePath}`);
                }
            } else {
                try {
                    await this.vault.adapter.mkdir(cumulativePath);
                } catch (e) {
                    if (!(await this.vault.adapter.exists(cumulativePath))) {
                        console.error(`[${this.pluginName}] Failed to create directory ${cumulativePath}.`, e);
                        throw e;
                    }
                    const stat = await this.vault.adapter.stat(cumulativePath);
                    if (stat && stat.type === 'file') {
                        throw new Error(`[${this.pluginName}] Conflict while creating directory: ${cumulativePath} is a file.`);
                    }
                }
            }
        }
    }

    public async checkAndUnzipWebapp(): Promise<void> {
        if (!this.manifest.dir) {
            new Notice(`${this.pluginName}: Could not determine plugin directory.`);
            console.error(`${this.pluginName}: Plugin directory (this.manifest.dir) is not available.`);
            return;
        }

        const pluginBaseDir = this.manifest.dir;
        const webappExpectedPath = `${pluginBaseDir}/webapp`; 
        const webappZipPath = `${pluginBaseDir}/webapp.zip`;

        try {
            const webappDirExists = await this.vault.adapter.exists(webappExpectedPath);

            if (webappDirExists) {
                const stat = await this.vault.adapter.stat(webappExpectedPath);
                if (stat && stat.type === 'folder') {
                    console.log(`${this.pluginName}: 'webapp' folder already exists at: ${webappExpectedPath}`);
                    const webappZipExists = await this.vault.adapter.exists(webappZipPath);
                    if (webappZipExists) {
                        new Notice(`${this.pluginName}: 'webapp' already exists, deleting residual 'webapp.zip'.`);
                        await this._deleteWebappZip(webappZipPath);
                    }
                    return;
                } else {
                    new Notice(`${this.pluginName}: Error: '${webappExpectedPath}' exists but is not a folder.`);
                    console.error(`${this.pluginName}: Error: '${webappExpectedPath}' exists but is not a folder.`);
                    return;
                }
            }

            new Notice(`${this.pluginName}: 'webapp' folder not found. Searching for 'webapp.zip'...`);
            console.log(`${this.pluginName}: '${webappExpectedPath}' not found. Checking for '${webappZipPath}'...`);

            const webappZipExists = await this.vault.adapter.exists(webappZipPath);

            if (!webappZipExists) {
                new Notice(`${this.pluginName}: 'webapp.zip' not found in '${pluginBaseDir}'. Cannot extract.`);
                console.warn(`${this.pluginName}: '${webappZipPath}' not found. Cannot extract webapp.`);
                return;
            }

            new Notice(`${this.pluginName}: 'webapp.zip' found. Starting extraction...`);
            console.log(`${this.pluginName}: '${webappZipPath}' found. Starting extraction relative to '${pluginBaseDir}'...`);

            const zipFileData = await this.vault.adapter.readBinary(webappZipPath);
            const zip = await JSZip.loadAsync(zipFileData);

            let fileCount = 0;
            const sortedZipEntries = Object.keys(zip.files)
                                         .filter(key => key.trim().length > 0 && key !== "/")
                                         .sort();

            for (const relativePathInZip of sortedZipEntries) {
                const zipEntry = zip.files[relativePathInZip];
                const normalizedRelativePath = relativePathInZip.replace(/\\/g, '/').replace(/^\//, '');
                
                if (!normalizedRelativePath) continue;

                const fullDestPath = `${pluginBaseDir}/${normalizedRelativePath}`;

                if (zipEntry.dir) {
                    await this._ensureDirectory(fullDestPath);
                } else {
                    const parentDir = fullDestPath.substring(0, fullDestPath.lastIndexOf('/'));
                    if (parentDir) {
                       await this._ensureDirectory(parentDir);
                    }
                    
                    const fileDataUint8Array = await zipEntry.async("uint8array");
                    
                    const copiedUint8Array = fileDataUint8Array.slice(); 
                    await this.vault.adapter.writeBinary(fullDestPath, copiedUint8Array.buffer);
                    fileCount++;
                }
            }

            if (fileCount > 0) {
                new Notice(`${this.pluginName}: 'webapp.zip' extraction complete. 'webapp' folder is available in plugin directory.`);
                console.log(`${this.pluginName}: 'webapp.zip' extracted. ${fileCount} files processed. 'webapp' folder should now be available at '${webappExpectedPath}'.`);
                
                await this._deleteWebappZip(webappZipPath);

            } else if (Object.keys(zip.files).filter(k => !zip.files[k].dir).length === 0 && Object.keys(zip.files).length > 0) {
                new Notice(`${this.pluginName}: 'webapp.zip' contains entries, but no files were extracted. Check archive structure (expected 'webapp' folder inside).`);
                console.warn(`${this.pluginName}: 'webapp.zip' contained entries but actual files were not extracted. Check archive structure (expected 'webapp/' prefix in paths).`);
            } else {
                new Notice(`${this.pluginName}: 'webapp.zip' was empty or no files could be extracted.`);
                console.warn(`${this.pluginName}: 'webapp.zip' was empty or no files could be extracted.`);
            }

        } catch (error) {
            new Notice(`${this.pluginName}: An error occurred during 'webapp.zip' extraction. See console for details.`);
            console.error(`${this.pluginName}: Error during checkAndUnzipWebapp:`, error);
        }
    }

    private async _deleteWebappZip(zipPath: string): Promise<void> {
        try {
            await this.vault.adapter.remove(zipPath); 
            console.log(`${this.pluginName}: 'webapp.zip' successfully deleted.`);
            new Notice(`${this.pluginName}: 'webapp.zip' successfully deleted.`, 3000);
        } catch (deleteError) {
            console.error(`${this.pluginName}: Failed to delete 'webapp.zip'.`, deleteError);
            new Notice(`${this.pluginName}: Failed to delete 'webapp.zip'.`);
        }
    }
}