import { App, Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import express from 'express';
import { Server } from 'http';

import { DrawioPluginSettings } from './classes/settings/Settings';
import DrawioPlugin from '../main';

function getDrawioPaths(app: App, manifestDir: string) {
    const vaultBasePath = (app.vault.adapter as any).basePath as string;
    const pluginDir = path.join(vaultBasePath, manifestDir);
    const webAppPath = path.join(pluginDir, "webapp");
    return { vaultBasePath, pluginDir, webAppPath };
}

function checkWebAppFolder(webAppPath: string): boolean {
    if (!fs.existsSync(webAppPath)) {
        new Notice("📂 'webapp' folder not found. Please ensure Draw.io webapp is in your plugin folder.");
        return false;
    }
    return true;
}

function startExpressServer(webAppPath: string, port: number): Promise<Server> {
    return new Promise((resolve, reject) => {
        const app = express();
        app.use(express.static(webAppPath));

        const server = app.listen(port, () => {
            console.log(`Draw.io server running at http://localhost:${port}`);
            new Notice(`🚀 Draw.io server started on port ${port}`);
            resolve(server);
        }).on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                (`❌ Port ${port} is already in use. Draw.io server could not start.`);
                console.error(`Port ${port} is already in use.`);
            } else {
                new Notice(`❌ Failed to start Draw.io server: ${err.message}`);
                console.error(`Failed to start Draw.io server:`, err);
            }
            reject(err);
        });
    });
}

export async function launchDrawioServerLogic(plugin: DrawioPlugin): Promise<void> {
    if (plugin.expressServer) return;
    const { webAppPath } = getDrawioPaths(plugin.app, plugin.manifest.dir!);

    if (!checkWebAppFolder(webAppPath)) {
        return;
    }

    try {
        plugin.expressServer = await startExpressServer(webAppPath, plugin.settings.port);
        await new Promise((res) => setTimeout(res, 1000));
    } catch (error) {
        plugin.expressServer = null;
    }
}