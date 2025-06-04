import { App, PluginSettingTab, Setting, TextComponent, Notice } from "obsidian";
import type DrawIOPlugin from "../../../main";

export class DrawioSettingTab extends PluginSettingTab {
    plugin: DrawIOPlugin;
    private portTextComponent: TextComponent;

    constructor(app: App, plugin: DrawIOPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        console.log("DrawioSettingTab: Constructor called.");
    }

    display(): void {
        console.log("DrawioSettingTab: display() called.");
        console.log("DrawioSettingTab: 'this' is:", this);

        if (!this) {
            console.error("DrawioSettingTab: CRITICAL - 'this' is undefined or null in display()!");
            new Notice("Critical error: 'this' is undefined in display() of Draw-io.");
            return;
        }

        console.log("DrawioSettingTab: 'this.containerEl' is:", this.containerEl);

        let containerElLocal: HTMLElement;
        try {
            const { containerEl } = this; 
            containerElLocal = containerEl;
        } catch (e) {
            console.error("DrawioSettingTab: Error during destructuring 'containerEl' from 'this':", e);
            console.error("DrawioSettingTab: 'this' context at error:", this);
            new Notice("Error initializing containerEl in Draw-io.");
            return;
        }
        
        if (!containerElLocal) {
            console.error("DrawioSettingTab: 'containerElLocal' is undefined after destructuring!");
            console.error("DrawioSettingTab: 'this.containerEl' was:", this.containerEl);
            new Notice("Error: containerEl is undefined after destructuring in Draw-io.");
            return; 
        }

        try {
            containerElLocal.empty();
            containerElLocal.createEl('h2', { text: 'Draw.io settings' });

            const defaultPort = 8080;

            new Setting(containerElLocal)
                .setName('Set server port for Draw.io app')
                .setDesc('pott (1-65535). Changes are saved and verified when the settings window is closed.')
                .addText(text => {
                    this.portTextComponent = text;
                    text.setPlaceholder(`For example:, ${defaultPort}`)
                        .setValue(this.plugin.settings.port.toString())
                        .onChange(value => {
                        });
                });
        } catch (error) {
            console.error("DrawioSettingTab: Error using 'containerElLocal':", error);
            new Notice("An error occurred while rendering Draw-io settings.");
        }
    }
    

    async hide() {
        if (!this.portTextComponent) {
            console.warn("DrawioSettingTab: hide() called but portTextComponent is not initialized.");
            return; 
        }
        
        const defaultPort = 8080;
        const currentValueInField = this.portTextComponent.getValue(); 
        const parsedPortFromField = parseInt(currentValueInField, 10);

        let targetPort = this.plugin.settings.port; 
        let messageForNotice: string | null = null;
        
        const originalPortBeforeThisHide = this.plugin.settings.port;

        if (isNaN(parsedPortFromField) || parsedPortFromField <= 0 || parsedPortFromField > 65535) {
            targetPort = defaultPort;
            if (originalPortBeforeThisHide !== defaultPort || currentValueInField !== defaultPort.toString()) {
                messageForNotice = `🚫 The entered port "${currentValueInField}" is invalid. Default port ${targetPort} has been set.`;
            }
        } else {
            targetPort = parsedPortFromField;
            if (originalPortBeforeThisHide !== targetPort) {
                messageForNotice = `⚙️ Draw.io plugin port changed to ${targetPort}.`;
            }
        }
        
        this.plugin.settings.port = targetPort;
        await this.plugin.saveSettings();

        if (messageForNotice) {
        new Notice(messageForNotice + " Restart Obsidian or the plugin to apply changes.");        }
    }
}