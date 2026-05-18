import DrawioPlugin from "main";
import { MIME_TYPES } from "Types/MIME_TYPES";

import http, { Server } from "http"
import path from "path";
import fs from 'fs';
import { App } from "obsidian";

export class ServerManager {
    private plugin: DrawioPlugin;

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin;
    }

    private createServer(): Server {
        const paths = this.getDrawioPaths(this.plugin.app, this.plugin.manifest.dir!);
        const baseDir = paths.webAppPath;

        const server = http.createServer((req, res) => {
            const safeUrl = req.url === '/' ? '/index.html' : req.url;
            
            const cleanUrl = safeUrl?.split('?')[0] || '/index.html';     
            const filePath = path.join(baseDir, cleanUrl);
            
            const extname = String(path.extname(filePath)).toLowerCase();
            const contentType = MIME_TYPES[extname] || 'application/octet-stream';

            fs.readFile(filePath, (error, content) => {
                if (error) {
                    if (error.code === 'ENOENT') {
                        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end(`404: Файл не найден по пути ${cleanUrl}`);
                    } else {
                        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end(`500: Ошибка сервера (${error.code})`);
                    }
                } else {
                    res.writeHead(200, { 
                        'Content-Type': contentType,
                        'Access-Control-Allow-Origin': '*',
                        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
                    });
                    res.end(content);
                }
            });
        });

        const port = this.plugin.settings.port || 4444;
        server.listen(port, () => {
        
        });        

        return server;
    }

    startServer() {
        if(this.plugin.server) return;

        const server = this.createServer();
        this.plugin.server = server;
    }

    stopServer() {
        if(this.plugin.server) {
            this.plugin.server.close();
        }
    }

    private getDrawioPaths(app: App, manifestDir: string) {
        const vaultBasePath = (app.vault.adapter as any).basePath as string;
        const pluginDir = path.join(vaultBasePath, manifestDir);
        const webAppPath = path.join(pluginDir, "webapp");
        return { vaultBasePath, pluginDir, webAppPath };
    }
}