import { App, DropdownComponent, PluginSettingTab, Setting, TFolder } from "obsidian";
import DrawioPlugin from "../main";

export type savingNameFileFormatOption =
	"date" |
	"number"

export type diagramTheme =
	"auto" |
	"dark" |
	"light"

export type editorTheme =
	"auto" |
	"dark" |
	"light"

export interface DrawioSettings {
	port: string;
	currentlyDrawioClientVersion: string;
	folder: string;
	savingNameFileFormat: savingNameFileFormatOption
	centeringDiagrams: boolean
	interactiveDiagrams: boolean
	diagramSizeInPopupHover: string
	diagramThemeInPreviewMode: diagramTheme
	diagramThemeInEditMode: diagramTheme
	EditorTheme: editorTheme
}

export const DEFAULT_SETTINGS: DrawioSettings = {
	port: "4444",
	currentlyDrawioClientVersion: "",
	folder: "drawio",
	savingNameFileFormat: "date",
	centeringDiagrams: true,
	interactiveDiagrams: true,
	diagramSizeInPopupHover: "100%",
	diagramThemeInPreviewMode: "auto",
	diagramThemeInEditMode: "auto",
	EditorTheme: "auto"
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

		new Setting(containerEl)
			.setName('interactive diagrams')
			.setDesc("if enable, do diagram interactive")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.interactiveDiagrams)
				.onChange(async (value) => {
					this.plugin.settings.interactiveDiagrams = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName('diagram size in hover window')
			.setDesc('Set the diagram size in the hover window')
			.addText(text => text
				.setPlaceholder('e.c: 75% or 450')
				.setValue(this.plugin.settings.diagramSizeInPopupHover)
				.onChange(async (value) => {
					this.plugin.settings.diagramSizeInPopupHover = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('diagram theme in preview mode')
			.setDesc('Set theme for diagrams in the obsidian preview mode')
			.addDropdown(DropdownComponent => {

				DropdownComponent.addOption("auto" as diagramTheme, "auto")
				DropdownComponent.addOption("dark" as diagramTheme, "dark theme")
				DropdownComponent.addOption("light" as diagramTheme, "light theme")

				DropdownComponent.setValue(this.plugin.settings.diagramThemeInPreviewMode || "auto");

				DropdownComponent.onChange(async (value) => {
					this.plugin.settings.diagramThemeInPreviewMode = value as diagramTheme;
					await this.plugin.saveSettings()
				})
			})

		new Setting(containerEl)
			.setName('diagram theme in edit mode')
			.setDesc('Set theme for diagrams in the obsidian edit mode')
			.addDropdown(DropdownComponent => {

				DropdownComponent.addOption("auto" as diagramTheme, "auto")
				DropdownComponent.addOption("dark" as diagramTheme, "dark theme")
				DropdownComponent.addOption("light" as diagramTheme, "light theme")

				DropdownComponent.setValue(this.plugin.settings.diagramThemeInEditMode || "auto");

				DropdownComponent.onChange(async (value) => {
					this.plugin.settings.diagramThemeInEditMode = value as diagramTheme;
					await this.plugin.saveSettings()
				})
			})

		new Setting(containerEl)
			.setName('draw.io editor theme')
			.setDesc('Set theme for the draw.io editor')
			.addDropdown(DropdownComponent => {

				DropdownComponent.addOption("auto" as editorTheme, "auto")
				DropdownComponent.addOption("dark" as editorTheme, "dark theme")
				DropdownComponent.addOption("light" as editorTheme, "light theme")

				DropdownComponent.setValue(this.plugin.settings.EditorTheme || "auto");

				DropdownComponent.onChange(async (value) => {
					this.plugin.settings.EditorTheme = value as editorTheme;
					await this.plugin.saveSettings()
				})
			})
	}
}