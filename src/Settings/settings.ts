import { App, DropdownComponent, PluginSettingTab, Setting, TFolder } from "obsidian";
import DrawioPlugin from "../main";

export type savingNameFileFormatOption =
	"date" |
	"number"


export interface DrawioSettings {
	port: string;
	currentlyDrawioClientVersion: string;
	folder: string;
	savingNameFileFormat: savingNameFileFormatOption
	centeringDiagrams: boolean
}

export const DEFAULT_SETTINGS: DrawioSettings = {
	port: "4444",
	currentlyDrawioClientVersion: "",
	folder: "drawio",
	savingNameFileFormat: "date",
	centeringDiagrams: true,
}

export class SettingTab extends PluginSettingTab {
	plugin: DrawioPlugin;

	constructor(app: App, plugin: DrawioPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

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

		new Setting(containerEl)
			.setName('Folder')
			.setDesc('Set Folder for saving diagrams')
			.addDropdown(DropdownComponent => {
				const folders = this.app.vault.getAllFolders();
				folders.forEach((folder: TFolder) => {
					DropdownComponent.addOption(folder.path, folder.path)
				});

				DropdownComponent.onChange(async (value) => {
					this.plugin.settings.folder = value;
					await this.plugin.saveSettings()
				})
			})

		new Setting(containerEl)
			.setName('diagram name')
			.setDesc('Select the format what save diagram')
			.addDropdown(DropdownComponent => {
				DropdownComponent.addOption("date" as savingNameFileFormatOption, "date: 2025.05.12.svg.drawio")

				DropdownComponent.onChange(async (value) => {
					this.plugin.settings.folder = value;
					await this.plugin.saveSettings()
				})
			})

		new Setting(containerEl)
			.setName('centering diagrams')
			.setDesc("if enable, diagram will be center")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.centeringDiagrams)
				.onChange(async (value) => {
					this.plugin.settings.centeringDiagrams = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);
	}
}