import DrawioPlugin from "main";
import { Notice, PluginManifest } from "obsidian";
import { SettingTab } from "Settings/settings";

export class PluginInit {
    private plugin: DrawioPlugin;

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin
    };

    async loadSettings(): Promise<void> {
       await this.plugin.loadSettings();
       this.plugin.addSettingTab(new SettingTab(this.plugin.app, this.plugin));
    }

    async addRibbonIcon(): Promise<any> {
        this.plugin.addRibbonIcon('dice', 'Sample', async (evt: MouseEvent) => {
			new Notice('This is a notice!');
            	await this.plugin.drawioClientManager.checkAndUpdate();
		        this.plugin.serverManager.startServer();
        })
    }
}
