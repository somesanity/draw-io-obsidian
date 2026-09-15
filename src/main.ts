import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, DrawioSettings, } from "./Settings/settings";
import { PluginInit } from 'Utils/PluginInit';
import { Server } from 'http';
import { ServerManager } from 'Utils/ServerManager';
import { DrawioClientManager } from 'Utils/DrawioClientManager';
import { ExternalLinkTooltip } from 'Utils/ExternalLinkTooltip';
import { SidecarManager } from 'Utils/SidecarManager';

export default class DrawioPlugin extends Plugin {
	settings!: DrawioSettings;
	initter!: PluginInit;
	server!: Server
	serverManager!: ServerManager;
	drawioClientManager!: DrawioClientManager
	sidecarManager!: SidecarManager;


	async onload() {

		// init classes
		const initter = new PluginInit(this);
		this.initter = initter;
		this.drawioClientManager = new DrawioClientManager(this);
		this.serverManager = new ServerManager(this);

		// init plugin
		await initter.loadSettings();
		this.sidecarManager = new SidecarManager(this);
		initter.setPluginLanguage();
		await initter.registerCommands();
		await initter.registerViews();
		initter.registerExtensions();
		initter.addRibbonIcon();
		initter.registerPostProcessings();
		initter.registerEditorExtensions();
		initter.registerEvents();
		await this.drawioClientManager.checkAndUpdate();

		this.drawioClientManager.initDelayedCheck();
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

		this.initter.canvasManager.destroy();
		this.sidecarManager.destroy();
	}

	async activateView(ViewType: string, options?: { file?: { path: string };[key: string]: any }) {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;

		if (options?.file?.path) {
			const existingLeaves = workspace.getLeavesOfType(ViewType);
			for (const l of existingLeaves) {
				const currentLeafState = l.getViewState().state as { file?: { path?: string } } | undefined;
				if (currentLeafState?.file?.path === options.file.path) {
					leaf = l;
					break;
				}
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
			return;
		}

		leaf = workspace.getLeaf('tab');

		if (leaf) {
			await leaf.setViewState({
				type: ViewType,
				active: true,
				state: options
			});

			workspace.revealLeaf(leaf);
		}
	}
}