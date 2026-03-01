import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";
import DrawioPlugin from "./main";

export interface DrawioSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: DrawioSettings = {
	mySetting: 'default'
}

export class SettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: DrawioPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
