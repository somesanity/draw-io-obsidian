import {
    Plugin,
    WorkspaceLeaf,
    ItemView,
    Notice,
    App,
    Modal,
    Editor,
    Menu,
    MarkdownView,
    TFile,
} from "obsidian";
import * as path from "path";
import * as fs from "fs";
import { Server } from "http";
import express from "express";
import { Buffer } from 'buffer';

const DRAWIO_VIEW = "drawio-webview";
const DRAWIO_PORT = 8080;

declare module 'obsidian' {
    interface MarkdownView {
        rebuildView(): void;
    }
}

export default class DrawIOPlugin extends Plugin {
    private expressServer: Server | null = null;

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

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: ItemView) => {

                let filePathToEdit: string | null = null;
                const selection = editor.getSelection();
                const cursor = editor.getCursor();

                if (selection) {
                    const match = selection.match(/^!\[\[([^\]]+\.(?:drawio\.svg|drawio))\]\]$/);
                    if (match && match[1]) {
                        filePathToEdit = match[1];
                    }
                }

                if (!filePathToEdit) {
                    const line = editor.getLine(cursor.line);
                    const linkRegex = /!\[\[([^\]]+\.(?:drawio\.svg|drawio))\]\]/g;
                    let execMatch;
                    while ((execMatch = linkRegex.exec(line)) !== null) {
                        const fullMatchText = execMatch[0];
                        const potentialPath = execMatch[1];
                        const startIndex = execMatch.index;
                        const endIndex = startIndex + fullMatchText.length;

                        if (cursor.ch >= startIndex && cursor.ch <= endIndex) {
                            filePathToEdit = potentialPath;
                            break;
                        }
                    }
                }

                if (filePathToEdit) {
                    const finalPath = filePathToEdit;
                    menu.addItem((item) => {
                        item
                            .setTitle(`Edit ${path.basename(finalPath)}`)
                            .setIcon("pencil")
                            .setSection("drawio-actions")
                            .onClick(async () => {
                                const abstractFile = this.app.vault.getAbstractFileByPath(finalPath);
                                if (abstractFile instanceof TFile) {
                                    await this.launchDrawioServer();
                                    new DrawioEmbedModal(this.app, editor, this, abstractFile).open();
                                } else {
                                    new Notice(`❌ Draw.io file not found: ${finalPath}`);
                                }
                            });
                    });
                } else {
                    menu.addItem((item) => {
                        item
                            .setTitle("Embed New Draw.io Diagram")
                            .setIcon("shapes")
                            .setSection("drawio-actions")
                            .onClick(async () => {
                                await this.launchDrawioServer();
                                new DrawioEmbedModal(this.app, editor, this).open();
                            });
                    });
                }
            })
        );

        this.registerDomEvent(document, "click", this.handleDiagramClick.bind(this));
 
        document.body.addClass("drawio-plugin-body");
        new Notice("✅ Draw.io plugin loaded");
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
        if (this.expressServer) return;

        const vaultBasePath = (this.app.vault.adapter as any).basePath as string;
        const pluginDir = path.join(vaultBasePath, this.manifest.dir!);
        const webAppPath = path.join(pluginDir, "webapp");

        if (!fs.existsSync(webAppPath)) {
            new Notice("📂 'webapp' folder not found. Please ensure Draw.io webapp is in your plugin folder.");
            return;
        }

        const app = express();
        app.use(express.static(webAppPath));

        this.expressServer = app.listen(DRAWIO_PORT, () => {
            console.log(`Draw.io server running at http://localhost:${DRAWIO_PORT}`);
            new Notice(`🚀 Draw.io server started on port ${DRAWIO_PORT}`);
        }).on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                new Notice(`❌ Port ${DRAWIO_PORT} is already in use. Draw.io server could not start.`);
                console.error(`Port ${DRAWIO_PORT} is already in use.`);
            } else {
                new Notice(`❌ Failed to start Draw.io server: ${err.message}`);
                console.error(`Failed to start Draw.io server:`, err);
            }
            this.expressServer = null;
        });

        await new Promise((res) => setTimeout(res, 1000)); 
    }

    private async handleDiagramClick(event: MouseEvent) {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }

        const target = event.target as HTMLElement;
        const embedEl = target.closest('img.internal-embed, svg.internal-embed');

        if (embedEl) {
            const src = embedEl.getAttribute('src');
            if (src) {
                let filePath = src;
                const obsidianProtocolPrefix = `app://local/${encodeURIComponent(this.app.vault.getName())}/`;
                if (filePath.startsWith(obsidianProtocolPrefix)) {
                    filePath = decodeURIComponent(filePath.substring(obsidianProtocolPrefix.length));
                }

                if (filePath.endsWith('.drawio.svg')) {
                    event.preventDefault();
                    event.stopPropagation();

                    const file = this.app.vault.getAbstractFileByPath(filePath);

                    if (file instanceof TFile) {
                        await this.launchDrawioServer();
                        const currentMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (currentMarkdownView) {
                            new DrawioEmbedModal(this.app, currentMarkdownView.editor, this, file).open();
                        } else {
                            new Notice("Cannot edit diagram: No active Markdown view.");
                        }
                    } else {
                        new Notice(`❌ File not found or is not a TFile: ${filePath}`);
                    }
                }
            }
        }
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
                src: `http://localhost:${DRAWIO_PORT}/?embed=1&proto=json&libraries=1&spin=1&ui=dark&dark=1&splash=0`,
                style: "width: 100%; height: 100%; border: none;",
            },
        });

        this.iframe.addEventListener("dragover", this.handleDragOver.bind(this));
        this.iframe.addEventListener("dragleave", this.handleDragLeave.bind(this));
        this.iframe.addEventListener("drop", this.handleDrop.bind(this));
        this.iframe.addEventListener("dragenter", this.handleDragEnter.bind(this));

        const messageHandler = async (event: MessageEvent) => {
            if (event.origin !== `http://localhost:${DRAWIO_PORT}`) return;
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
            this.iframe.contentWindow.postMessage(JSON.stringify(message), `http://localhost:${DRAWIO_PORT}`);
        }
    }
}


// --- Модальное окно --- 
class DrawioEmbedModal extends Modal {
    private editor: Editor;
    private currentFile: TFile | null = null;
    private iframe: HTMLIFrameElement | null = null;
    private messageHandler: ((event: MessageEvent) => Promise<void>) | null = null;
    private plugin: DrawIOPlugin;
    private isEmptyDiagram: boolean = true;

    constructor(app: App, editor: Editor, plugin: DrawIOPlugin, fileToEdit: TFile | null = null) {
        super(app);
        this.editor = editor;
        this.plugin = plugin;
        this.currentFile = fileToEdit;
        this.modalEl.addClass("drawio-embed-modal");

        this.modalEl.style.width = "98vw";
        this.modalEl.style.height = "98vh";
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.titleEl.setText(this.currentFile ? `Edit Diagram: ${this.currentFile.name}` : "Embed Draw.io Diagram");

        if (!this.currentFile) {
            const newFile = await this.createNewDiagramFile();
            if (!newFile) {
                new Notice("❌ Failed to create a new diagram file.");
                this.close();
                return;
            }
            this.currentFile = newFile;
            this.editor.replaceSelection(`![[${this.currentFile.path}]]`);
            this.isEmptyDiagram = true;
        } else {
            this.isEmptyDiagram = false;
        }

        this.iframe = contentEl.createEl("iframe", {
            attr: {
                src: `http://localhost:${DRAWIO_PORT}/?embed=1&proto=json&libraries=1&spin=1&ui=dark&dark=1&splash=0`,
                style: "width: 100%; height: 100%; border: none;",
            },
        });

        this.messageHandler = async (event: MessageEvent) => {
            if (event.origin !== `http://localhost:${DRAWIO_PORT}`) return;
            let msg;
            try {
                msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
            } catch (e) { return; }

            switch (msg.event) {
                case "init":
                    if (this.currentFile) {
                        const fileContent = await this.app.vault.read(this.currentFile);
                        this.sendMessageToDrawio({ action: "load", xml: fileContent, autosave: 1 });
                    } else {

                        const emptyXml = "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>";
                        this.sendMessageToDrawio({ action: "load", xml: emptyXml, autosave: 1 });
                    }
                    break;
                case "save":
                    this.sendMessageToDrawio({ action: "export", format: "xmlsvg", xml: 1, empty: 1 });
                    break;
                case "export":
                    await this.saveDiagramFromModal(msg.data);
                    break;
                case "change":
                    const baseEmptyXml = "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>";

                    this.isEmptyDiagram = (!msg.xml || msg.xml === baseEmptyXml);

                    break;
                case "exit":
                    console.log("👋 User exited Draw.io in modal via Draw.io button");
                    this.close();
                    break;
            }
        };

        window.addEventListener("message", this.messageHandler);
    }

    async onClose() {
        const { contentEl } = this;
        contentEl.empty();
        if (this.messageHandler) {
            window.removeEventListener("message", this.messageHandler);
            this.messageHandler = null;
        }
        
        await this.handleModalCloseBasedOnContent();

        this.iframe = null;
        this.isEmptyDiagram = true;
    }

    private sendMessageToDrawio(message: object) {
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(JSON.stringify(message), `http://localhost:${DRAWIO_PORT}`);
        }
    }

    private async createNewDiagramFile(): Promise<TFile | null> {
        const folderPath = "Drawio";
        try {
            const folderExists = this.app.vault.getAbstractFileByPath(folderPath);
            if (!folderExists) {
                await this.app.vault.createFolder(folderPath);
            }
        } catch (err) {
            new Notice("❌ Could not create 'Drawio' folder for new diagram.");
            console.error("Error creating Drawio folder:", err);
            return null;
        }

        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
        const fileName = `diagram_${timestamp}.drawio.svg`;
        const fullPath = `${folderPath}/${fileName}`;
        const emptySvgContent = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="1px" height="1px" viewBox="-0.5 -0.5 1 1" content="&lt;mxGraphModel&gt;&lt;root&gt;&lt;mxCell id=&quot;0&quot;/&gt;&lt;mxCell id=&quot;1&quot; parent=&quot;0&quot;/&gt;&lt;/root&gt;&lt;/mxGraphModel&gt;"><defs/><g/></svg>`;

        try {
            const newFile = await this.app.vault.create(fullPath, emptySvgContent);
            new Notice(`📝 Created temporary diagram file: ${fullPath}`);
            return newFile;
        } catch (e) {
            new Notice(`❌ Failed to create new diagram file: ${fullPath}`);
            console.error("Error creating new diagram file:", e);
            return null;
        }
    }

    private async saveDiagramFromModal(svgDataUri: string) {
        if (!this.currentFile) {
            new Notice("❌ No file to save to in modal.");
            return;
        }

        let contentToSave: string;
        if (svgDataUri.startsWith("data:image/svg+xml;base64,")) {
            try {
                const base64Part = svgDataUri.split(',')[1];
                contentToSave = Buffer.from(base64Part, 'base64').toString('utf-8');
            } catch (e) {
                new Notice("❌ Failed to decode SVG content from modal.");
                console.error("SVG decoding error in modal:", e);
                return;
            }
        } else if (svgDataUri.startsWith("data:image/svg+xml,")) {
            try {
                contentToSave = decodeURIComponent(svgDataUri.split(',')[1]);
            } catch (e) {
                new Notice("❌ Failed to decode SVG content from modal.");
                console.error("SVG decoding error (URI component) in modal:", e);
                return;
            }
        }
        else {
            new Notice("❌ Invalid SVG data format received in modal.");
            console.error("Invalid SVG data format:", svgDataUri.substring(0,100));
            return;
        }
        
        try {
            await this.app.vault.modify(this.currentFile, contentToSave);
            new Notice(`💾 Diagram saved: ${this.currentFile.path}`);
            this.forceMarkdownViewUpdate(this.currentFile);
            
            const emptyDrawioXmlInSvgContent = `content="&lt;mxGraphModel&gt;&lt;root&gt;&lt;mxCell id=&quot;0&quot;/&gt;&lt;mxCell id=&quot;1&quot; parent=&quot;0&quot;/&gt;&lt;/root&gt;&lt;/mxGraphModel&gt;"`;
            const emptySvgStructureIndicator = `<g/>`;
            const isActuallyEmpty = contentToSave.includes(emptyDrawioXmlInSvgContent) &&
                                    contentToSave.includes(emptySvgStructureIndicator) &&
                                    (contentToSave.match(/<g\b[^>]*>/g) || []).length === 1 &&
                                    !contentToSave.includes('<path') &&
                                    !contentToSave.includes('<rect') &&
                                    !contentToSave.includes('<ellipse') &&
                                    !contentToSave.includes('<text');
            this.isEmptyDiagram = isActuallyEmpty;

        } catch (e) {
            new Notice(`❌ Failed to save diagram: ${this.currentFile.path}`);
            console.error("Error saving diagram in modal:", e);
        }
    }

    private async handleModalCloseBasedOnContent() {
        if (this.currentFile) {
            let currentFileContent = "";
            try {
                currentFileContent = await this.app.vault.read(this.currentFile);
            } catch (readError) {
                console.warn(`Could not read file ${this.currentFile.path} during modal close:`, readError);
                this.currentFile = null;
                return;
            }

            const emptyDrawioXmlInSvgContent = `content="&lt;mxGraphModel&gt;&lt;root&gt;&lt;mxCell id=&quot;0&quot;/&gt;&lt;mxCell id=&quot;1&quot; parent=&quot;0&quot;/&gt;&lt;/root&gt;&lt;/mxGraphModel&gt;"`;
            const emptySvgStructureIndicator = `<g/>`;
            
            const isActuallyEmpty = currentFileContent.includes(emptyDrawioXmlInSvgContent) &&
                                    currentFileContent.includes(emptySvgStructureIndicator) &&
                                    (currentFileContent.match(/<g\b[^>]*>/g) || []).length === 1 &&
                                    !currentFileContent.includes('<path') &&
                                    !currentFileContent.includes('<rect') &&
                                    !currentFileContent.includes('<ellipse') &&
                                    !currentFileContent.includes('<image') &&
                                    !currentFileContent.includes('<text');

            if (this.isEmptyDiagram || isActuallyEmpty) {
                try {
                    const pathToDelete = this.currentFile.path;
                    await this.app.vault.delete(this.currentFile);
                    new Notice(`🗑️ Deleted empty diagram file: ${pathToDelete}`);
                    
                    const editorContent = this.editor.getValue();
                    const linkToDelete = `![[${pathToDelete}]]`;
                    const linkToDeleteEncoded = `![[${encodeURI(pathToDelete)}]]`;


                    if (editorContent.includes(linkToDelete)) {
                        this.editor.setValue(editorContent.replace(linkToDelete, ''));
                        new Notice("🔗 Removed empty diagram link from editor.");
                    } else if (editorContent.includes(linkToDeleteEncoded)) {
                         this.editor.setValue(editorContent.replace(linkToDeleteEncoded, ''));
                        new Notice("🔗 Removed empty diagram link (encoded) from editor.");
                    }

                } catch (e) {
                    if (!(e instanceof Error && e.message.toLowerCase().includes("file already deleted"))) {
                         new Notice(`❌ Failed to delete empty diagram file: ${this.currentFile.path}`);
                         console.error("Error deleting empty diagram file:", e);
                    }
                }
            }
        }
        this.currentFile = null;
    }

    private async forceMarkdownViewUpdate(file: TFile) {
        const leaves = this.app.workspace.getLeavesOfType("markdown");
        for (const leaf of leaves) {
            const mdView = leaf.view as MarkdownView;
            if (!mdView || !mdView.file) continue;

            try {
                let needsRebuild = mdView.file.path === file.path;
                if (!needsRebuild) {
                    const fileContent = await this.app.vault.cachedRead(mdView.file);
                    if (fileContent.includes(file.name) || fileContent.includes(encodeURI(file.name))) {
                        needsRebuild = true;
                    }
                }

                if (needsRebuild) {
                    if (typeof (leaf as any).rebuildView === 'function') {
                        await (leaf as any).rebuildView();
                    } else {

                        const viewState = leaf.getViewState();
                        await leaf.setViewState({ type: 'empty' });
                        await leaf.setViewState(viewState);
                    }
                }
            } catch (err) {
                console.warn(`Could not update view for ${mdView.file.path} regarding changes to ${file.path}:`, err);
            }
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
    } else if (svgDataUri.startsWith("data:image/svg+xml,")) {
        try {
            contentToSave = decodeURIComponent(svgDataUri.split(',')[1]);
        } catch (e) {
            new Notice("❌ Failed to decode SVG content (URI component).");
            console.error("SVG decoding error (URI component):", e);
            return;
        }
    }
    else {
        new Notice("❌ Invalid SVG data format received.");
        console.error("Invalid SVG data format:", svgDataUri.substring(0,100));
        return;
    }

    const emptyDrawioXmlInSvgContent = `content="&lt;mxGraphModel&gt;&lt;root&gt;&lt;mxCell id=&quot;0&quot;/&gt;&lt;mxCell id=&quot;1&quot; parent=&quot;0&quot;/&gt;&lt;/root&gt;&lt;/mxGraphModel&gt;"`;
    const emptySvgStructureIndicator = `<g/>`;
    const isActuallyEmpty = contentToSave.includes(emptyDrawioXmlInSvgContent) &&
                            contentToSave.includes(emptySvgStructureIndicator) &&
                            (contentToSave.match(/<g\b[^>]*>/g) || []).length === 1 &&
                            !contentToSave.includes('<path') &&
                            !contentToSave.includes('<rect') &&
                            !contentToSave.includes('<ellipse') &&
                            !contentToSave.includes('<image') &&
                            !contentToSave.includes('<text');

    if (isActuallyEmpty && !view.currentFile) {
        new Notice("🚫 Diagram appears empty, not saving new file.");
        return;
    }


    let savedFile: TFile | null = null;

    if (view.currentFile) {
        if (isActuallyEmpty) {
             new Notice(`🚫 Diagram content is empty. ${view.currentFile.path} not modified with empty content from main view. Close to delete if intended.`);
             return;
        }
        await app.vault.modify(view.currentFile, contentToSave);
        savedFile = view.currentFile;
        new Notice(`💾 Diagram updated: ${savedFile.path}`);
    } else {
        try {
            const folderExists = app.vault.getAbstractFileByPath(folderPath);
            if (!folderExists) {
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

    const leaves = app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
        const mdView = leaf.view as MarkdownView;
        if (!mdView.file) continue;
        
        let needsRebuild = mdView.file.path === savedFile.path;
        
		if(!needsRebuild) {
            try {
                const fileContent = await app.vault.cachedRead(mdView.file);
                 if (fileContent.includes(savedFile.name) || fileContent.includes(encodeURI(savedFile.name))) {
                    needsRebuild = true;
                }
            } catch(err) {
				console.log(err)
			}
        };

        if (needsRebuild) {
             try {
                if (typeof (leaf as any).rebuildView === 'function') {
                    await (leaf as any).rebuildView();
                } else {
                    const currentViewState = leaf.getViewState();
                    await leaf.setViewState({ type: 'empty' });
                    await leaf.setViewState(currentViewState);
                }
            } catch (err) {
                console.warn(`Could not update view for ${mdView.file.path}:`, err);
            }
        }
    }
}


async function handleDrawioMessage(msg: any, sourceWindow: Window, app: App, view: DrawIOView) {
    switch (msg.event) {
        case "init":
            if (view.currentFile) {
                const fileContent = await app.vault.read(view.currentFile);
                sourceWindow.postMessage(JSON.stringify({ action: "load", xml: fileContent, autosave: 1 }), `http://localhost:${DRAWIO_PORT}`);
            } else {
                sourceWindow.postMessage(JSON.stringify({ action: "load", xml: "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>", autosave: 1 }), `http://localhost:${DRAWIO_PORT}`);
            }
            break;
        case "save":
            sourceWindow.postMessage(JSON.stringify({ action: "export", format: "xmlsvg", xml: 1, empty: 1 }), `http://localhost:${DRAWIO_PORT}`);
            break;
        case "export":
            await saveOrUpdateDrawioFile(app, view, msg.data);
            break;
        case "change":
            break;
        case "exit":
            console.log("👋 User exited Draw.io from main view");
            break;
    }
}