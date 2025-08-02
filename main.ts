import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';

import { DRAWIOVIEW } from 'consts';
import { Drawioview } from 'views/drawioView';
import { setLocale, t } from 'locales/i18n';
import { Server } from 'node:http';
import { launchDrawioServerLogic } from 'handlers/ServerStart';
import { DrawioSettings, DEFAULT_SETTINGS } from 'settings/Settings';
import { DrawioTab } from 'settings/Settings-tab';
import { CenteringDiagrams } from 'utils/centeringDiagrams';
import { DefaultDiagramSize } from 'utils/DefaultDiagramSize';
import { InteractiveDiagrams } from 'utils/interactiveDiagrams';

export default class DrawioPlugin extends Plugin {

isServerOpen: Server | null = null;
settings: DrawioSettings;

  async onload() {

	await this.loadSettings();
	this.addSettingTab(new DrawioTab(this.app, this));

	this.registerView(
		DRAWIOVIEW,
		(leaf) => new Drawioview(leaf, this) 
	)
	
	const userLang = (window.localStorage.getItem('language') || 'en').split('-')[0];
	setLocale(userLang);

	this.addRibbonIcon('dice', t("ribonIconTitle"), async () => {
		this.activateView()
		await launchDrawioServerLogic(this)
	}) 

	await CenteringDiagrams(this)
	await DefaultDiagramSize(this)
	await InteractiveDiagrams(this)
  }

async loadSettings() {
	this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

async saveSettings() {
	await this.saveData(this.settings);
}

  async onunload() {
	if (this.isServerOpen) {
        this.isServerOpen.close(() => {
            new Notice(t("StopDrawioClinetServer"));
            this.isServerOpen = null;
        });
    }
  }

  async activateView() {
	const leaf = this.app.workspace.getLeaf(false);
	if(leaf) {
		await leaf.setViewState({
		type: DRAWIOVIEW,
		active: true,
    });
    this.app.workspace.revealLeaf(leaf);
	}
  }
}