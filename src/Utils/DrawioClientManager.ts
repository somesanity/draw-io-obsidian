import { DRAWIO_CLIENT_DOWNLOADING_LINK, DRAWIO_CLIENT_LAST_RELEASE } from "consts";
import DrawioPlugin from "main";
import { Notice, requestUrl } from 'obsidian';
import { LastReleaseData } from "Types/UpdateResponseJson";
import JSZip from "jszip";

export class DrawioClientManager {

    private plugin: DrawioPlugin;

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin;
    }

    public async checkAndUpdate() {
        const isUpdate = await this.compareVersions();
        const folderIsExist = await this.plugin.app.vault.adapter.exists(`${this.plugin.manifest.dir}/webapp`)
        if(!isUpdate || !folderIsExist) {
            await this.runInstallationProcess();
            await this.unzipDrawioClient();
            const LastVersion = await this.getLastVersion();
            if(LastVersion) {
                this.plugin.settings.currentlyDrawioClientVersion = LastVersion 
                await this.plugin.saveSettings()
            }
        }
    }

    private async getLastVersion(): Promise<string | void> {
    try {
        const response = await requestUrl({        
            url: DRAWIO_CLIENT_LAST_RELEASE,
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'Obsidian-Plugin-CheckUpdate'
            }
        });
        
        const data: LastReleaseData = await response.json;
        
        return data.tag_name

        } catch (error) {
          return console.error("Не удалось узнать версию", error);
        }
    }

    async compareVersions(): Promise<boolean | unknown> {
        try {
            const lastVersion = await this.getLastVersion();
            const currentlyVersion = this.plugin.settings.currentlyDrawioClientVersion;

            if(currentlyVersion === lastVersion) {
                return true;
            } else {
                return false;
            }
            
        } catch (error) {
            return console.log(error);
        }
    }

    private async runInstallationProcess(): Promise<void> {
        try {
            const pluginBaseDir = this.plugin.manifest.dir;
            const drawioClientZipPath = `${pluginBaseDir}/webapp.zip`;
            const response = await requestUrl({ url: DRAWIO_CLIENT_DOWNLOADING_LINK });
            
            if (response.status !== 200) {
                throw new Error(`Network error: ${response.status}`);
            }

            await this.plugin.app.vault.adapter.writeBinary(drawioClientZipPath, response.arrayBuffer);
            
            new Notice("Клиент успешно скачен!");

        } catch (error: any) {
            new Notice(`Ошибка: ${error.message}`);
            console.error("Installation error:", error);
        }
    }

    private async unzipDrawioClient() {
        try {
            const pluginBaseDir = this.plugin.manifest.dir;
            const drawioClientZipPath = `${pluginBaseDir}/webapp.zip`;
            const adapter = this.plugin.app.vault.adapter;

            if (!(await adapter.exists(drawioClientZipPath))) {
                new Notice(`Ошибка: Файл ${drawioClientZipPath} не найден!`);
                return;
            }

            const zipBuffer = await adapter.readBinary(drawioClientZipPath);
            const zip = await JSZip.loadAsync(zipBuffer);
            
            const RootFolderInZip = Object.keys(zip.files)[0];

            if(!RootFolderInZip) {
                throw new Error("zip is empty.")
            }

            const rootDirInZip = RootFolderInZip.split('/')[0];
            
            const webappFolder = `${rootDirInZip}/src/main/webapp/`;
            
            new Notice(`${this.plugin.manifest.name}: Распаковка клиента draw.io...`);

            for (const relativePath in zip.files) {
                if (relativePath.startsWith(webappFolder) && relativePath !== webappFolder) {
                    const zipEntry = zip.files[relativePath];
                    
                    const cleanSubPath = relativePath.substring(webappFolder.length);
                    
                    const fullPathOnDisk = `${pluginBaseDir}/webapp/${cleanSubPath}`;
                    
                    if (zipEntry!.dir) {
                        if (!(await adapter.exists(fullPathOnDisk))) {
                            await adapter.mkdir(fullPathOnDisk);
                        }
                    } else {
                        const fileData = await zipEntry!.async("uint8array");
                        
                        const parentDir = fullPathOnDisk.substring(0, fullPathOnDisk.lastIndexOf('/'));
                        if (!(await adapter.exists(parentDir))) {
                            await adapter.mkdir(parentDir);
                        }

                    await adapter.writeBinary(fullPathOnDisk, fileData.buffer as ArrayBuffer);
                    }
                }
            }

            if (await adapter.exists(drawioClientZipPath)) {
                await adapter.remove(drawioClientZipPath);
            }

        } catch (error) {
            console.error(`[Drawio КРИТИЧЕСКАЯ ОШИБКА]:`, error);
            new Notice(`Критическая ошибка при распаковке. Откройте консоль (Ctrl+Shift+I).`);
        }
    }
}