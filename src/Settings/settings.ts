import { App, DropdownComponent, PluginSettingTab, Setting, TFolder, ToggleComponent } from "obsidian";
import DrawioPlugin from "../main";
import { t } from "locales/I18n";

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
			.setName(t("SETTINGS_PORT__NAME"))
			.setDesc(t("SETTINGS_PORT__DESCRIPTION"))
			.addText(text => text
				.setPlaceholder(t("SETTINGS_PORT__PLACEHOLDER"))
				.setValue(this.plugin.settings.port)
				.onChange(async (value) => {
					this.plugin.settings.port = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("SETTINGS_FOLDER__NAME"))
			.setDesc(t("SETTINGS_FOLDER__DESCRIPTION"))
			.addDropdown(dropdown => {
				const folders = this.app.vault.getAllFolders();
				folders.forEach((folder: TFolder) => {
					dropdown.addOption(folder.path, folder.path);
				});

				dropdown.setValue(this.plugin.settings.folder || "drawio");
				dropdown.onChange(async (value) => {
					this.plugin.settings.folder = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t("SETTINGS_FILE_FORMAT__NAME"))
			.setDesc(t("SETTINGS_FILE_FORMAT__DESCRIPTION"))
			.addDropdown(dropdown => {
				dropdown.addOption("timestamp", `timestamp: ${Date.now().toString()}.drawio.svg`);
				dropdown.addOption("uuid", `uuid: ${crypto.randomUUID()}.drawio.svg`);
				dropdown.addOption("iso-date-8601", `iso-date-8601: 2026-06-02_12-30-45.drawio.svg`);
				dropdown.addOption("set name", t("FORMAT_SET_NAME"));

				dropdown.setValue(this.plugin.settings.savingNameFileFormat || "timestamp");
				dropdown.onChange(async (value) => {
					this.plugin.settings.savingNameFileFormat = value as savingNameFileFormatOption;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t("SETTINGS_CENTERING__NAME"))
			.setDesc(t("SETTINGS_CENTERING__DESCRIPTION"))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.centeringDiagrams)
				.onChange(async (value) => {
					this.plugin.settings.centeringDiagrams = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(t("SETTINGS_INTERACTIVE__NAME"))
			.setDesc(t("SETTINGS_INTERACTIVE__DESCRIPTION"))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.interactiveDiagrams)
				.onChange(async (value) => {
					this.plugin.settings.interactiveDiagrams = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(t("SETTINGS_HOVER_SIZE__NAME"))
			.setDesc(t("SETTINGS_HOVER_SIZE__DESCRIPTION"))
			.addText(text => text
				.setPlaceholder(t("SETTINGS_HOVER_SIZE__PLACEHOLDER"))
				.setValue(this.plugin.settings.diagramSizeInPopupHover)
				.onChange(async (value) => {
					this.plugin.settings.diagramSizeInPopupHover = value;
					await this.plugin.saveSettings();
				}));

		const addThemeOptions = (dropdown: DropdownComponent) => {
			dropdown.addOption("auto", t("THEME_AUTO"));
			dropdown.addOption("dark", t("THEME_DARK"));
			dropdown.addOption("light", t("THEME_LIGHT"));
		};

		new Setting(containerEl)
			.setName(t("SETTINGS_THEME_PREVIEW__NAME"))
			.setDesc(t("SETTINGS_THEME_PREVIEW__DESCRIPTION"))
			.addDropdown(dropdown => {
				addThemeOptions(dropdown);
				dropdown.setValue(this.plugin.settings.diagramThemeInPreviewMode || "auto");
				dropdown.onChange(async (value) => {
					this.plugin.settings.diagramThemeInPreviewMode = value as diagramTheme;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t("SETTINGS_THEME_EDIT__NAME"))
			.setDesc(t("SETTINGS_THEME_EDIT__DESCRIPTION"))
			.addDropdown(dropdown => {
				addThemeOptions(dropdown);
				dropdown.setValue(this.plugin.settings.diagramThemeInEditMode || "auto");
				dropdown.onChange(async (value) => {
					this.plugin.settings.diagramThemeInEditMode = value as diagramTheme;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t("SETTINGS_EDITOR_THEME__NAME"))
			.setDesc(t("SETTINGS_EDITOR_THEME__DESCRIPTION"))
			.addDropdown(dropdown => {
				addThemeOptions(dropdown);
				dropdown.setValue(this.plugin.settings.EditorTheme || "auto");
				dropdown.onChange(async (value) => {
					this.plugin.settings.EditorTheme = value as editorTheme;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t("SETTINGS_CANVAS_BORDER__NAME"))
			.setDesc(t("SETTINGS_CANVAS_BORDER__DESCRIPTION"))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.HiddenBorderInCanvas)
				.onChange(async (value) => {
					this.plugin.settings.HiddenBorderInCanvas = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(t("SETTINGS_CANVAS_LABEL__NAME"))
			.setDesc(t("SETTINGS_CANVAS_LABEL__DESCRIPTION"))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.HiddenLabelInCanvas)
				.onChange(async (value) => {
					this.plugin.settings.HiddenLabelInCanvas = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(t("SETTINGS_CANVAS_FOCUS__NAME"))
			.setDesc(t("SETTINGS_CANVAS_FOCUS__DESCRIPTION"))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.AlwaysFocusedInCanvas)
				.onChange(async (value) => {
					this.plugin.settings.AlwaysFocusedInCanvas = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(t("SETTINGS_FOCUS_BORDER__NAME"))
			.setDesc(t("SETTINGS_FOCUS_BORDER__DESCRIPTION"))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.HiddenBorderInFocusMode)
				.onChange(async (value) => {
					this.plugin.settings.HiddenBorderInFocusMode = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(t("SETTINGS_CANVAS_TRANSPARENT__NAME"))
			.setDesc(t("SETTINGS_CANVEL_TRANSPARENT__DESCRIPTION"))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.TransparentDiagramBackgroundInCanavas)
				.onChange(async (value) => {
					this.plugin.settings.TransparentDiagramBackgroundInCanavas = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName(t("SETTINGS_THEME_CANVAS__NAME"))
			.setDesc(t("SETTINGS_THEME_CANVAS__DESCRIPTION"))
			.addDropdown(dropdown => {
				addThemeOptions(dropdown);
				dropdown.setValue(this.plugin.settings.diagramThemeInCanvas || "auto");
				dropdown.onChange(async (value) => {
					this.plugin.settings.diagramThemeInCanvas = value as diagramTheme;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t("SETTINGS_SCALE_COPY__NAME"))
			.setDesc(t("SETTINGS_SCALE_COPY__DESCRIPTION"))
			.addText(text => text
				.setPlaceholder(t("SETTINGS_SCALE_COPY__PLACEHOLDER"))
				.setValue(this.plugin.settings.scaleCopyDiagramAsImage)
				.onChange(async (value) => {
					this.plugin.settings.scaleCopyDiagramAsImage = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(t("SETTINGS_AUTO_UPDATE__NAME"))
			.setDesc(t("SETTINGS_AUTO_UPDATE__DESCRIPTION"))
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