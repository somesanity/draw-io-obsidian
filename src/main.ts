import { App, Editor, MarkdownView, Modal, Notice, Plugin, SettingTab } from 'obsidian';
import { DEFAULT_SETTINGS, DrawioSettings, } from "./settings";
import { pluginInit } from 'Utils/PluginInit';

export default class DrawioPlugin extends Plugin {
	settings: DrawioSettings;

	async onload() {
		const initter = new pluginInit(this);
		initter.addRibbonIcon();
		initter.loadSettingsTab();
	}

	async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

	onunload() {
	}
}