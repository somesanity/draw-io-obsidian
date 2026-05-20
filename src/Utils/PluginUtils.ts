import DrawioPlugin from "main";

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
}