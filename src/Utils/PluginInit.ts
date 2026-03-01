import DrawioPlugin from "main";
import { Notice, PluginSettingTab } from "obsidian";
import { DEFAULT_SETTINGS, SettingTab } from "settings";
import { SampleModal } from "./View/ModalView";
import { promises } from "dns";

export class pluginInit {
    plugin: DrawioPlugin;

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin
    };

    async loadSettingsTab(): Promise<any> {
        await this.plugin.loadSettings();
        this.plugin.addSettingTab(new SettingTab(this.plugin.app, this.plugin));
    }

    addRibbonIcon(): any {
        this.plugin.addRibbonIcon('dice', 'Sample', (evt: MouseEvent) => {
			new Notice('This is a notice!');
	    })
    }
}
