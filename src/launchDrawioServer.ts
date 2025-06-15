import { App, Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as url from 'url';

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

function startSimpleStaticServer(webAppPath: string, port: number): Promise<Server> {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url || '');
            let filePath = path.join(webAppPath, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname || '');

            if (!filePath.startsWith(webAppPath)) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('403 Forbidden');
                return;
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end(`500 Internal Server Error: ${err.message}`);
                    }
                } else {
                    const ext = path.extname(filePath).toLowerCase();
                    let contentType = 'application/octet-stream';

                    switch (ext) {
                        case '.html': contentType = 'text/html'; break;
                        case '.js': contentType = 'application/javascript'; break;
                        case '.css': contentType = 'text/css'; break;
                        case '.json': contentType = 'application/json'; break;
                        case '.png': contentType = 'image/png'; break;
                        case '.jpg': contentType = 'image/jpeg'; break;
                        case '.gif': contentType = 'image/gif'; break;
                        case '.svg': contentType = 'image/svg+xml'; break;
                        case '.woff': contentType = 'font/woff'; break;
                        case '.woff2': contentType = 'font/woff2'; break;
                        case '.ttf': contentType = 'font/ttf'; break;
                        case '.ico': contentType = 'image/x-icon'; break;
                    }
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(data);
                }
            });
        });

        server.listen(port, () => {
            new Notice(`✅ Draw.io server started on port ${port}`);
            console.log(`Draw.io server started on http://localhost:${port}`);
            resolve(server);
        }).on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                new Notice(`❌ Порт ${port} уже занят. Сервер Draw.io не запущен.`);
                console.error(`Порт ${port} уже занят.`);
            } else {
                new Notice(`❌ Не удалось запустить сервер Draw.io: ${err.message}`);
                console.error(`Не удалось запустить сервер Draw.io:`, err);
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
        plugin.expressServer = await startSimpleStaticServer(webAppPath, plugin.settings.port);
        await new Promise((res) => setTimeout(res, 1000));
    } catch (error) {
        plugin.expressServer = null;
    }
}