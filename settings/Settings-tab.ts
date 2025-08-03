import DrawioPlugin from "main";
import { App, DropdownComponent, PluginSettingTab, Setting, TFolder } from 'obsidian';

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
      .setName('Set port')
      .setDesc('Set port')
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
      .setName('Centering Diagram')
      .setDesc('If active all diagram will be position to center')
      .addToggle((toggle) => 
        toggle
          .setValue(this.plugin.settings.centeringDiagram)
          .onChange(async (value) => {
            this.plugin.settings.centeringDiagram = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName('Percent size')
      .setDesc('Percent Size')
      .addToggle((toggle) => 
        toggle
          .setValue(this.plugin.settings.percentSize)
          .onChange(async (value) => {
            this.plugin.settings.percentSize = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName('Interactive diagrams')
      .setDesc('Interactive diagrams')
      .addToggle((toggle) => 
        toggle
          .setValue(this.plugin.settings.interactiveDiagram)
          .onChange(async (value) => {
            this.plugin.settings.interactiveDiagram = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName('Use markdown Links')
      .setDesc('If enable link will be markdown link style')
      .addToggle((toggle) => 
        toggle
          .setValue(this.plugin.settings.useMarkdownLinks)
          .onChange(async (value) => {
            this.plugin.settings.useMarkdownLinks = value;
            await this.plugin.saveSettings();
          })
      );

      new Setting(containerEl)
      .setName('Select folder')
      .setDesc('Select folder that save diagrams')
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
      .setName('diagram width')
      .setDesc('Set default diagram size')
      .addText((text) =>
        text
          .setPlaceholder('100%')
          .setValue(this.plugin.settings.diagramSize)
          .onChange(async (value) => {
            this.plugin.settings.diagramSize = value;
            await this.plugin.saveSettings();
          })
      );
  }
}