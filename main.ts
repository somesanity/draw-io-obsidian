import { Plugin, Notice } from "obsidian";
import { Server } from "http";
import { DrawioPluginSettings, DEFAULT_SETTINGS } from "src/classes/settings/Settings";
import { launchDrawioServerLogic } from "src/launchDrawioServer";
import { PluginInitializer } from "./src/classes/plugin-initializer";

import { WebappManager } from "./src/utils/webAppManager";


export default class DrawIOPlugin extends Plugin {
    expressServer: Server | null = null;
    settings: DrawioPluginSettings;
    private webappManager: WebappManager;

    async onload() {
        this.webappManager = new WebappManager(this.app, this.manifest);
        await this.webappManager.checkAndUnzipWebapp();

        await this.loadSettings();
        const initializer = new PluginInitializer(this);
        initializer.initialize();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    
        this.app.workspace.onLayoutReady(() => {
        });
    
    }

    onunload() {
        if (this.expressServer) {
            this.expressServer.close(() => {
                new Notice("🛑 Draw.io server stopped");
                this.expressServer = null;
            });
        }
        document.body.removeClass("drawio-embed-modal");
    }
    
    public async launchDrawioServer() {
        await launchDrawioServerLogic(this);
    }
}