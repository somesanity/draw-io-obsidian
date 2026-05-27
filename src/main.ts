import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, DrawioSettings, } from "./Settings/settings";
import { PluginInit } from 'Utils/PluginInit';
import { Server } from 'http';
import { ServerManager } from 'Utils/ServerManager';
import { DrawioClientManager } from 'Utils/DrawioClientManager';
import { ExternalLinkTooltip } from 'Utils/ExternalLinkTooltip';

export default class DrawioPlugin extends Plugin {
	settings!: DrawioSettings;
	server!: Server
	serverManager!: ServerManager;
	drawioClientManager!: DrawioClientManager

	async onload() {

		// init classes
		const initter = new PluginInit(this);
		this.drawioClientManager = new DrawioClientManager(this);
		this.serverManager = new ServerManager(this);

		// init plugin
		await initter.loadSettings();
		await initter.registerCommands();
		await initter.registerViews();
		initter.addRibbonIcon();
		initter.registerPostProcessings();
		initter.registerEditorExtensions();

		await this.drawioClientManager.checkAndUpdate();

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		this.serverManager.stopServer();

		const tooltip = ExternalLinkTooltip.getInstance();
		tooltip.destroy();
	}

	async activateView(ViewType: string) {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(ViewType);

		if (leaves.length > 0) {
			leaf = leaves[0] as WorkspaceLeaf | null;
		} else {
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({ type: ViewType, active: true });
		}

		workspace.revealLeaf(leaf!);
	}
}