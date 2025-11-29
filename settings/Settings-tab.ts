import { t } from "locales/i18n";
import DrawioPlugin from "main";
import { App, PluginSettingTab, Setting, TFolder } from 'obsidian';

export class DrawioTab extends PluginSettingTab {
  plugin: DrawioPlugin;

  constructor(app: App, plugin: DrawioPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName(`${t('SETTINGS__SetPort_Name')}`)
      .setDesc(`${t('SETTINGS__SetPort_Description')}`)
      .addText((text) =>
        text
          .setPlaceholder('1717')
          .setValue(this.plugin.settings.port)
          .onChange(async (value) => {
            this.plugin.settings.port = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName(`${t('SETTINGS__CenteringDiagrams_Name')}`)
      .setDesc(`${t('SETTINGS__CenteringDiagrams_Description')}`)
      .addToggle((toggle) => 
        toggle
          .setValue(this.plugin.settings.centeringDiagram)
          .onChange(async (value) => {
            this.plugin.settings.centeringDiagram = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName(`${t('SETTINGS__PercentDiagramsSize_Name')}`)
      .setDesc(`${t('SETTINGS__PercentDiagramsSize_Description')}`)
      .addToggle((toggle) => 
        toggle
          .setValue(this.plugin.settings.percentSize)
          .onChange(async (value) => {
            this.plugin.settings.percentSize = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName(`${t('SETTINGS__InteractiveDiagrams_Name')}`)
      .setDesc(`${t('SETTINGS__InteractiveDiagrams_Description')}`)
      .addToggle((toggle) => 
        toggle
          .setValue(this.plugin.settings.interactiveDiagram)
          .onChange(async (value) => {
            this.plugin.settings.interactiveDiagram = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName(`${t('SETTINGS__MarkdownLinks_Name')}`)
      .setDesc(`${t('SETTINGS__MarkdownLinks_Description')}`)
      .addToggle((toggle) => 
        toggle
          .setValue(this.plugin.settings.useMarkdownLinks)
          .onChange(async (value) => {
            this.plugin.settings.useMarkdownLinks = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName(`${t('SETTINGS__FolderForSaveDiagrams_Name')}`)
      .setDesc(`${t('SETTINGS__FolderForSaveDiagrams_Description')}`)
      .addDropdown(dropdown => {
        const folders = this.app.vault.getAllLoadedFiles().filter(file => file instanceof TFolder);
        
        folders.forEach((folder: TFolder) => {
            dropdown.addOption(folder.path, folder.path);
        })

        dropdown.setValue(this.plugin.settings.Folder);

        dropdown.onChange(async (value) => {
            this.plugin.settings.Folder = value;
            await this.plugin.saveSettings();
        });
      }
      );

      new Setting(containerEl)
      .setName(`${t('SETTINGS__DefaultDiagramsSize_Name')}`)
      .setDesc(`${t('SETTINGS__DefaultDiagramsSize_Description')}`)
      .addText((text) =>
        text
          .setPlaceholder('100%')
          .setValue(this.plugin.settings.diagramSize)
          .onChange(async (value) => {
            this.plugin.settings.diagramSize = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
    .setName(`${t('SETTINGS__HoverSizeDiagram_Name')}`)
    .setDesc(`${t('SETTINGS__HoverSizeDiagram_Description')}`)
    .addText((text) =>
      text
        .setPlaceholder('100%')
        .setValue(this.plugin.settings.HoverSizeDiagram)
        .onChange(async (value) => {
          this.plugin.settings.HoverSizeDiagram = value;
          await this.plugin.saveSettings();
        })
    );
  }
}