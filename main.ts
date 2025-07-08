import { Plugin, Notice } from "obsidian";
import { Server } from "http";
import { DrawioPluginSettings, DEFAULT_SETTINGS } from "src/classes/settings/Settings";
import { launchDrawioServerLogic } from "src/launchDrawioServer";
import { PluginInitializer } from "./src/classes/plugin-initializer";

import { DrawioClientManager } from "./src/utils/drawioClientManager";

export default class DrawIOPlugin extends Plugin {
    expressServer: Server | null = null;
    settings: DrawioPluginSettings;
    private drawioclientwebappManager: DrawioClientManager;

    async onload() {
        this.drawioclientwebappManager = new DrawioClientManager(this.app, this.manifest);
        
        await this.drawioclientwebappManager.checkAndUnzipDrawioClient();

        await this.loadSettings();
        const initializer = new PluginInitializer(this);
        initializer.initialize();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);    
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