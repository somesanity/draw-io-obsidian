import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';

import { DRAWIOVIEW } from 'consts';
import { Drawioview } from 'views/drawioView';
import { setLocale, t } from 'locales/i18n';
import { Server } from 'node:http';
import { launchDrawioServerLogic } from 'handlers/ServerStart';

export default class DrawioPlugin extends Plugin {

	isServerOpen: Server | null = null;

  async onload() {
	this.registerView(
		DRAWIOVIEW,
		(leaf) => new Drawioview(leaf) 
	)

	const userLang = (window.localStorage.getItem('language') || 'en').split('-')[0];
	setLocale(userLang);

	this.addRibbonIcon('dice', t("ribonIconTitle"), async () => {
		this.activateView()
		await launchDrawioServerLogic(this)
	}) 
  }

  async onunload() {
	if (this.isServerOpen) {
        this.isServerOpen.close(() => {
            new Notice("🛑 Draw.io server stopped");
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