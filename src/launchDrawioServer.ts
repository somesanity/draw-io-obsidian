import { App, FileSystemAdapter, Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as url from 'url';

import { Server } from 'http';

import { DrawioPluginSettings } from './classes/settings/Settings';
import DrawioPlugin from '../main';

function getDrawioPaths(app: App, manifestDir: string) {
    if (!(app.vault.adapter instanceof FileSystemAdapter)) {
        new Notice("Draw.io server only works with a local filesystem.");
        return null;
    }
    const vaultBasePath = app.vault.adapter.getBasePath();
    const pluginDir = path.join(vaultBasePath, manifestDir);
    const webAppPath = path.join(pluginDir, "webapp");
    const drawioClientPath = path.join(pluginDir, "drawioclient");
    return { vaultBasePath, pluginDir, webAppPath, drawioClientPath };
}

function getServePath(webAppPath: string, drawioClientPath: string): string | null {
    if (fs.existsSync(drawioClientPath)) {
        return drawioClientPath;
    } else if (fs.existsSync(webAppPath)) {
        return webAppPath;
    }
    return null;
}

function startSimpleStaticServer(servePath: string, port: number): Promise<Server> {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url || '');
            const requestedPath = parsedUrl.pathname === '/' ? 'index.html' : (parsedUrl.pathname || '');
            let filePath = path.join(servePath, requestedPath);

            if (!filePath.startsWith(servePath)) {
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

                    // Set content type based on file extension
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
                new Notice(`❌ Port ${port} is already in use. Draw.io server not started.`);
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

    const paths = getDrawioPaths(plugin.app, plugin.manifest.dir!);
    if (!paths) {
        return;
    }
    
    const { webAppPath, drawioClientPath } = paths;
    const servePath = getServePath(webAppPath, drawioClientPath);

    if (!servePath) {
        new Notice("📂 Neither 'webapp' nor 'drawioclient' folder found. Please ensure one is in your plugin folder.");
        return;
    }

    try {
        plugin.expressServer = await startSimpleStaticServer(servePath, plugin.settings.port);
        await new Promise((res) => setTimeout(res, 1000));
    } catch (error) {
        plugin.expressServer = null;
    }
}