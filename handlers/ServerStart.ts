import { IncomingMessage, Server, ServerResponse } from "http";
import { t } from "locales/i18n";
import DrawioPlugin from "main";
import { App, Notice } from "obsidian";

const http = require('http');
const fs = require('fs');
const path = require('path');


function getDrawioPaths(app: App, manifestDir: string) {
    const vaultBasePath = (app.vault.adapter as any).basePath as string;
    const pluginDir = path.join(vaultBasePath, manifestDir);
    const webAppPath = path.join(pluginDir, "webapp");
    return { vaultBasePath, pluginDir, webAppPath };
}

function serverStart(plugin: DrawioPlugin, webAppPath: string, port: number): Promise<Server> {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
            const requestUrl = new URL(req.url || '', `http://${req.headers.host}`);
            const filePath = path.join(
              webAppPath,
              requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname
            );

            if (!filePath.startsWith(webAppPath)) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('403 Forbidden');
                return;
            }

            fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: string) => {
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
            const port = plugin.settings.port;
            new Notice(`${t("StartDrawioClientSever")} ${port}`);
            resolve(server);
        }).on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                new Notice(`❌ ${port} ${t('FailedStartDrawioServerPortAlreadyExist')}`);
            } else {
                new Notice(`❌ ${t('FailedStartDrawioServer')} ${err.message}`);
            }
            reject(err);
        });
    });
}

export async function launchDrawioServerLogic(plugin: DrawioPlugin): Promise<void> {
    if (plugin.isServerOpen) return;

    const PORT = plugin.settings.port

    const { webAppPath } = getDrawioPaths(plugin.app, plugin.manifest.dir!);

    try {
        plugin.isServerOpen = await serverStart(plugin, webAppPath, Number(PORT));
        await new Promise((res) => setTimeout(res, 1000));
        console.log(plugin.settings.port)
    } catch (error) {
        plugin.isServerOpen = null;
    }
}