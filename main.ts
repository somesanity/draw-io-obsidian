import { Plugin, Notice } from "obsidian";
import { Server } from "http";
import { DrawioPluginSettings, DEFAULT_SETTINGS } from "src/classes/settings/Settings";
import { launchDrawioServerLogic } from "src/launchDrawioServer";
import { DRAWIO_VIEW } from "src/constants";
import { PluginInitializer } from "./src/classes/plugin-initializer";

export default class DrawIOPlugin extends Plugin {
    expressServer: Server | null = null;
    settings: DrawioPluginSettings;

    async onload() {
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
        this.app.workspace.detachLeavesOfType(DRAWIO_VIEW);
        document.body.removeClass("drawio-plugin-body");
    }
    
    public async launchDrawioServer() {
        await launchDrawioServerLogic(this);
    }
}