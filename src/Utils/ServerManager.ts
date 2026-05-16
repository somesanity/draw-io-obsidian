import DrawioPlugin from "main";
import http, { Server } from "http";

import fs from "fs";
import path from "path";

export class ServerManager {
    private plugin: DrawioPlugin;

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin;
    }

    private createServer(): Server {

    const PORT = this.plugin.settings.port;

    return http.createServer((req, res) => {
        let filePath = '.' + (req.url === '/' ? '/index.html' : req.url);
    
        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        // Read and serve the file
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404);
                    res.end('File Not Found');
                } else {
                    res.writeHead(500);
                    res.end(`Server Error: ${error.code}`);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }).listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`);
    });
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
}