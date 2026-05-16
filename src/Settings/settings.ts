import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "../main";
import DrawioPlugin from "../main";

export interface DrawioSettings {
	port: string;
	currentlyDrawioClientVersion: string;
}

export const DEFAULT_SETTINGS: DrawioSettings = {
	port: "4444",
	currentlyDrawioClientVersion: "",
}

export class SettingTab extends PluginSettingTab {
	plugin: DrawioPlugin;

	constructor(app: App, plugin: DrawioPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Port')
			.setDesc('Set port for draw.io client')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.port)
				.onChange(async (value) => {
					this.plugin.settings.port = value;
					await this.plugin.saveSettings();
				}));
	}
}