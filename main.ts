import { Plugin, WorkspaceLeaf, ItemView, Notice, App, TFile } from "obsidian";
import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { Buffer } from 'buffer'; // Node.js Buffer для работы с бинарными данными

const DRAWIO_VIEW = "drawio-webview";

export default class DrawIOPlugin extends Plugin {
    private serveProcess: ChildProcessWithoutNullStreams | null = null;

    async onload() {
        this.registerView(DRAWIO_VIEW, (leaf) => new DrawIOView(leaf, this));

        this.addRibbonIcon("shapes", "Open Draw.io", async () => {
            await this.launchDrawioServer();

            const leaf = this.app.workspace.getLeaf(true);
            await leaf.setViewState({
                type: DRAWIO_VIEW,
                active: true,
            });
        });

        document.body.addClass("drawio-plugin-body");
        new Notice("✅ Draw.io plugin loaded");
    }

    onunload() {
        if (this.serveProcess) {
            this.serveProcess.kill("SIGTERM");
            this.serveProcess = null;
            new Notice("🛑 Draw.io server stopped");
        }

        this.app.workspace.detachLeavesOfType(DRAWIO_VIEW);
        document.body.removeClass("drawio-plugin-body");
    }

    private async launchDrawioServer() {
        if (this.serveProcess) return;

        const vaultBasePath = (this.app.vault.adapter as any).basePath as string;
        const pluginDir = path.join(vaultBasePath, this.manifest.dir!);
        const webAppPath = path.join(pluginDir, "webapp");

        if (!fs.existsSync(webAppPath)) {
            new Notice("📂 'webapp' folder not found. Please ensure Draw.io webapp is in your plugin folder.");
            return;
        }

        this.serveProcess = spawn("npx", ["serve", webAppPath, "-l", "8080"], {
            cwd: pluginDir,
            shell: true,
            detached: false,
        });

        this.serveProcess.stdout?.on('data', (data) => console.log(`Draw.io Server: ${data}`));
        this.serveProcess.stderr?.on('data', (data) => console.error(`Draw.io Server Error: ${data}`));
        this.serveProcess.on('close', (code) => {
            console.log(`Draw.io server process exited with code ${code}`);
            if (this.serveProcess) {
                this.serveProcess = null;
                new Notice("🛑 Draw.io server stopped unexpectedly.");
            }
        });

        await new Promise((res) => setTimeout(res, 3000));
    }
}

class DrawIOView extends ItemView {
    private plugin: DrawIOPlugin;
    private iframe: HTMLIFrameElement | null = null;
    public currentFile: TFile | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: DrawIOPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return DRAWIO_VIEW; }
    getDisplayText(): string { return this.currentFile ? `Draw.io - ${this.currentFile.name}` : "Draw.io"; }
    getIcon(): string { return "shapes"; }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.currentFile = null;

        this.iframe = container.createEl("iframe", {
            attr: {
                src: "http://localhost:8080/?embed=1&proto=json&libraries=1&spin=1&ui=dark&dark=1&splash=0",
                style: "width: 100%; height: 100%; border: none;",
            },
        });

        this.iframe.addEventListener("dragover", this.handleDragOver.bind(this));
        this.iframe.addEventListener("dragleave", this.handleDragLeave.bind(this));
        this.iframe.addEventListener("drop", this.handleDrop.bind(this));
        this.iframe.addEventListener("dragenter", this.handleDragEnter.bind(this));

        const messageHandler = async (event: MessageEvent) => {
            if (event.origin !== "http://localhost:8080") return;
            let msg;
            try {
                msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
            } catch (e) { return; }
            await handleDrawioMessage(msg, event.source as Window, this.app, this);
        };

        window.addEventListener("message", messageHandler);
        this.register(() => window.removeEventListener("message", messageHandler));
    }

    async onClose() {
        this.containerEl.removeClass("drawio-drag-over");
        this.iframe = null;
        this.currentFile = null;
    }

    public setCurrentFile(file: TFile) {
        this.currentFile = file;
        this.leaf.updateHeader();
    }

    private handleDragEnter(event: DragEvent) { event.preventDefault(); this.containerEl.addClass("drawio-drag-over"); }
    private handleDragOver(event: DragEvent) { event.preventDefault(); event.dataTransfer!.dropEffect = "copy"; }
    private handleDragLeave(event: DragEvent) { this.containerEl.removeClass("drawio-drag-over"); }

    private async handleDrop(event: DragEvent) {
        event.preventDefault();
        this.containerEl.removeClass("drawio-drag-over");
        const textData = event.dataTransfer?.getData("text/plain");
        if (textData) {
            const obsidianUriMatch = textData.match(/^obsidian:\/\/open\?vault=.*?&file=(.*)$/);
            if (obsidianUriMatch && obsidianUriMatch[1]) {
                await this.processObsidianFileLink(decodeURIComponent(obsidianUriMatch[1]));
                return;
            }
            const obsidianInternalLinkMatch = textData.match(/\[\[(.*?)\]\]/);
            if (obsidianInternalLinkMatch && obsidianInternalLinkMatch[1]) {
                await this.processObsidianFileLink(obsidianInternalLinkMatch[1]);
                return;
            }
        }
    }

    private async processObsidianFileLink(filePath: string) {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
            const isDiagram = file.extension === "svg" || file.extension === "drawio" || file.extension === "xml";
            if (isDiagram) {
                this.setCurrentFile(file);
                new Notice(`📝 Editing: ${file.name}`);
                const fileContent = await this.app.vault.read(file);
                this.sendMessageToDrawio({ action: "load", xml: fileContent, autosave: 1 });
            } else {
                new Notice(`Unsupported file type for editing: ${file.extension}`);
            }
        } else {
            new Notice(`File not found: ${filePath}`);
        }
    }
    
    private sendMessageToDrawio(message: object) {
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(JSON.stringify(message), "http://localhost:8080");
        }
    }
}

async function saveOrUpdateDrawioFile(app: App, view: DrawIOView, svgDataUri: string) {
    const folderPath = "Drawio";

    let contentToSave: string;
    if (svgDataUri.startsWith("data:image/svg+xml;base64,")) {
        try {
            const base64Part = svgDataUri.split(',')[1];
            contentToSave = Buffer.from(base64Part, 'base64').toString('utf-8');
        } catch (e) {
            new Notice("❌ Failed to decode SVG content.");
            console.error("SVG decoding error:", e);
            return;
        }
    } else {
        new Notice("❌ Invalid SVG data format received.");
        return;
    }

    let savedFile: TFile | null = null;

    if (view.currentFile) {
        await app.vault.modify(view.currentFile, contentToSave);
        savedFile = view.currentFile;
        new Notice(`💾 Diagram updated: ${savedFile.path}`);
    } else {
        try {
            if (!app.vault.getAbstractFileByPath(folderPath)) {
                await app.vault.createFolder(folderPath);
            }
        } catch (err) {
            new Notice("❌ Could not create 'Drawio' folder.");
            return;
        }

        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
        const fileName = `diagram_${timestamp}.drawio.svg`;
        const fullPath = `${folderPath}/${fileName}`;

        try {
            savedFile = await app.vault.create(fullPath, contentToSave);
            view.setCurrentFile(savedFile);
            new Notice(`💾 Diagram saved as: ${fullPath}`);
        } catch (e) {
            new Notice(`❌ Failed to save diagram: ${fullPath}`);
            return;
        }
    }

    if (!savedFile) return;

    // 🌀 Форсируем обновление всех markdown-заметок, которые используют эту диаграмму
    const leaves = app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
        const mdView = leaf.view as any;
        const file = mdView.file;
        if (!file) continue;

        try {
            const fileContent = await app.vault.read(file);
            if (fileContent.includes(savedFile.name)) {
                // 💡 Перестраиваем представление
                await leaf.rebuildView?.(); // Optional chaining на случай отсутствия метода
            }
        } catch (err) {
            console.warn(`Could not update view for ${file.path}:`, err);
        }
    }
}


async function handleDrawioMessage(msg: any, sourceWindow: Window, app: App, view: DrawIOView) {
    switch (msg.event) {
        case "init":
            if (view.currentFile) {
                const fileContent = await app.vault.read(view.currentFile);
                sourceWindow.postMessage(JSON.stringify({ action: "load", xml: fileContent, autosave: 1 }), "http://localhost:8080");
            } else {
                sourceWindow.postMessage(JSON.stringify({ action: "load", xml: "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>", autosave: 1 }), "http://localhost:8080");
            }
            break;

        case "save":
            // ИЗМЕНЕНО: Запрашиваем редактируемый SVG (xmlsvg)
            sourceWindow.postMessage(JSON.stringify({ action: "export", format: "xmlsvg" }), "http://localhost:8080");
            break;

        case "export":
            // ИЗМЕНЕНО: msg.data теперь это data URI (data:image/svg+xml;base64,...)
            await saveOrUpdateDrawioFile(app, view, msg.data);
            break;

        case "exit":
            console.log("👋 User exited Draw.io");
            break;
    }
}