import { App, ButtonComponent, DropdownComponent, PluginSettingTab, Setting, TFolder, ToggleComponent } from "obsidian";
import DrawioPlugin from "../main";

export type savingNameFileFormatOption =
	"timestamp" |
	"uuid" |
	"iso-date-8601" |
	"set name"

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
	HiddenBorderInCanvas: boolean;
	HiddenLabelInCanvas: boolean;
	AlwaysFocusedInCanvas: boolean;
	HiddenBorderInFocusMode: boolean;
	TransparentDiagramBackgroundInCanavas: boolean;
	diagramThemeInCanvas: diagramTheme
	scaleCopyDiagramAsImage: string;
	clientAutoUpdate: boolean;
}

export const DEFAULT_SETTINGS: DrawioSettings = {
	port: "4444",
	currentlyDrawioClientVersion: "",
	folder: "drawio",
	savingNameFileFormat: "timestamp",
	centeringDiagrams: true,
	interactiveDiagrams: true,
	diagramSizeInPopupHover: "100%",
	diagramThemeInPreviewMode: "auto",
	diagramThemeInEditMode: "auto",
	EditorTheme: "auto",
	HiddenBorderInCanvas: false,
	HiddenLabelInCanvas: false,
	AlwaysFocusedInCanvas: false,
	HiddenBorderInFocusMode: false,
	TransparentDiagramBackgroundInCanavas: false,
	diagramThemeInCanvas: "auto",
	scaleCopyDiagramAsImage: "4",
	clientAutoUpdate: false
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

				DropdownComponent.setValue(this.plugin.settings.folder || "drawio");

				DropdownComponent.onChange(async (value) => {
					this.plugin.settings.folder = value;
					await this.plugin.saveSettings()
				})
			})

		new Setting(containerEl)
			.setName('diagram name')
			.setDesc('Select the format what save diagram')
			.addDropdown(DropdownComponent => {
				DropdownComponent.addOption("timestamp" as savingNameFileFormatOption, `timestamp: ${Date.now().toString()}.drawio.svg`)
				DropdownComponent.addOption("uuid" as savingNameFileFormatOption, `uuid: ${crypto.randomUUID()}.drawio.svg`)
				DropdownComponent.addOption("iso-date-8601" as savingNameFileFormatOption, `iso-date-8601: 2026-06-02_12-30-45.drawio.svg`)
				DropdownComponent.addOption("set name" as savingNameFileFormatOption, `any name that you can set`)

				DropdownComponent.setValue(this.plugin.settings.savingNameFileFormat || "timestamp");

				DropdownComponent.onChange(async (value) => {
					this.plugin.settings.savingNameFileFormat = value as savingNameFileFormatOption;
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

		new Setting(containerEl)
			.setName('Hidden border')
			.setDesc("if enable, the border in canvas will hidden")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.HiddenBorderInCanvas)
				.onChange(async (value) => {
					this.plugin.settings.HiddenBorderInCanvas = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName('Hidden label')
			.setDesc("if enable, the label text in canvas will hidden")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.HiddenLabelInCanvas)
				.onChange(async (value) => {
					this.plugin.settings.HiddenLabelInCanvas = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName('always focus')
			.setDesc("if enable, the diagram in the canvas will be always to focuse")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.AlwaysFocusedInCanvas)
				.onChange(async (value) => {
					this.plugin.settings.AlwaysFocusedInCanvas = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName('Hiden border in focus')
			.setDesc("if enable, the diagram in the focus will be hidden")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.HiddenBorderInFocusMode)
				.onChange(async (value) => {
					this.plugin.settings.HiddenBorderInFocusMode = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName('transparent background')
			.setDesc("if enable, diagram's background in the canvas will be trransparent")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.TransparentDiagramBackgroundInCanavas)
				.onChange(async (value) => {
					this.plugin.settings.TransparentDiagramBackgroundInCanavas = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName('Diagram theme in canvas')
			.setDesc('Set theme for diagrams in the canvas')
			.addDropdown(DropdownComponent => {

				DropdownComponent.addOption("auto" as diagramTheme, "auto")
				DropdownComponent.addOption("dark" as diagramTheme, "dark theme")
				DropdownComponent.addOption("light" as diagramTheme, "light theme")

				DropdownComponent.setValue(this.plugin.settings.diagramThemeInCanvas || "auto");

				DropdownComponent.onChange(async (value) => {
					this.plugin.settings.diagramThemeInCanvas = value as diagramTheme;
					await this.plugin.saveSettings()
				})
			})

		new Setting(containerEl)
			.setName('scale copied diagram')
			.setDesc('Set the scale size for copied diagram')
			.addText(text => text
				.setPlaceholder('e.c: 2 or 5')
				.setValue(this.plugin.settings.scaleCopyDiagramAsImage)
				.onChange(async (value) => {
					this.plugin.settings.scaleCopyDiagramAsImage = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Автоматическое обновление")
			.setDesc("Автоматически проверять и скачивать актуальную версию draw.io при запуске Obsidian.")
			.addToggle((toggle: ToggleComponent) => {
				toggle
					.setValue(this.plugin.settings.clientAutoUpdate)
					.onChange(async (value) => {
						this.plugin.settings.clientAutoUpdate = value;
						await this.plugin.saveSettings();
					});
			});

		this.plugin.drawioClientManager.createUpdateSetting(containerEl);
	}
}