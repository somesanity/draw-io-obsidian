import DrawioPlugin from "main";
import { normalizePath } from "obsidian";
import { savingNameFileFormatOption } from "Settings/settings";

export class pluginUtils {
    private plugin: DrawioPlugin

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin;
    }

    getServerUrl(option: "baseurl" | "fullUrl"): string {
        const baseUrl = `http://localhost:${this.plugin.settings.port}`

        const embedmode = `${baseUrl}/?embed=1&proto=json&libraries=1&spin=1&ui=white`

        switch (option) {
            case "baseurl": return baseUrl
            case "fullUrl": return embedmode

            default: return baseUrl
        }
    }

    async getFileNameForSave(): Promise<string> {
        const option: savingNameFileFormatOption = this.plugin.settings.savingNameFileFormat

        switch (option) {
            case "date": {
                const folder = this.plugin.settings.folder;
                const date = new Date();
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                const ms = String(date.getMilliseconds()).padStart(3, '0');

                const fulldate = `${year}${month}${day}${hours}${minutes}${seconds}${ms}`;
                const extension = '.drawio.svg'

                const fullpath = normalizePath(`${folder}/${fulldate}${extension}`)

                if (!await this.plugin.app.vault.adapter.exists(folder)) {
                    this.plugin.app.vault.createFolder(folder)
                    return fullpath;
                }


                return fullpath;
            }

            default: return ""
        }
    }

}