import { App, Modal, Editor, TFile, Notice, MarkdownView } from 'obsidian';
import DrawioPlugin from '../../main';

import { forceMarkdownViewUpdate } from '../utils/forceMarkdownViewUpdate';

export class DrawioEmbedModal extends Modal {
    private editor: Editor;
    private currentFile: TFile | null = null;
    private iframe: HTMLIFrameElement | null = null;
    private messageHandler: ((event: MessageEvent) => Promise<void>) | null = null;
    private plugin: DrawioPlugin;
    private isEmptyDiagram: boolean = true;

    constructor(app: App, editor: Editor, plugin: DrawioPlugin, fileToEdit: TFile | null = null) {
        super(app);
        this.editor = editor;
        this.plugin = plugin;
        this.currentFile = fileToEdit;
        this.modalEl.addClass("drawio-embed-modal");
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.titleEl.setText(this.currentFile ? `Edit Diagram: ${this.currentFile.name}` : "Embed Draw.io Diagram");

        if (!this.currentFile) {
            const newFile = await this.handleNewDiagramCreation();
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
                src: `http://localhost:${this.plugin.settings.port}/?embed=1&proto=json&libraries=1&spin=1&ui=dark&dark=1&splash=0`,
                
            },
        });
        this.iframe.addClass('drawio-embed-iframe');

        this.messageHandler = this.createMessageHandler();
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
        this.currentFile = null;
    }

    private sendMessageToDrawio(message: object) {
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(JSON.stringify(message), `http://localhost:${this.plugin.settings.port}`);
        }
    }

    private async handleNewDiagramCreation(): Promise<TFile | null> {

        const folderPath = this.plugin.settings.diagramsFolder || "Drawio"; 
        try {
            await this.app.vault.createFolder(folderPath);
            new Notice(`Created folder: ${folderPath}`);
        } catch (e: any) {
            if (!e.message.includes("Folder already exists")) {
                new Notice("❌ Could not create folder for new diagram.");
                console.error("Error creating Drawio folder:", e);
                return null;
            }
        }


        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
        const fileName = `diagram_${timestamp}.drawio.svg`;
        const fullPath = `${folderPath}/${fileName}`;
        
        const emptySvgContent = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="1px" height="1px" viewBox="-0.5 -0.5 1 1" content="&lt;mxGraphModel&gt;&lt;root&gt;&lt;mxCell id=&quot;0&quot;/&gt;&lt;mxCell id=&quot;1&quot; parent=&quot;0&quot;/&gt;&lt;/root&gt;&lt;/mxGraphModel&gt;"><defs/><g/></svg>`;

        try {
            const newFile = await this.app.vault.create(fullPath, emptySvgContent);
            return newFile;
        } catch (e) {
            new Notice(`❌ Failed to create new diagram file: ${fullPath}`);
            console.error("Error creating new diagram file:", e);
            return null;
        }
    }

    private createMessageHandler(): (event: MessageEvent) => Promise<void> {
        return async (event: MessageEvent) => {
            if (event.origin !== `http://localhost:${this.plugin.settings.port}`) return;

            let msg;
            try {
                msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
            } catch (e) { 
                console.warn("Could not parse Draw.io message:", event.data, e);
                return; 
            }

            switch (msg.event) {
                case "init":
                    await this.handleInitMessage();
                    break;
                case "save":
                    this.sendMessageToDrawio({ action: "export", format: "xmlsvg", xml: 1, empty: 1 });
                    break;
                case "export":
                    await this.handleExportMessage(msg.data);
                    break;
                case "change":
                    this.handleChangeMessage(msg.xml);
                    break;
                case "exit":
                    this.close();
                    break;
            }
        };
    }

    private async handleInitMessage() {
        if (this.currentFile) {
            const fileContent = await this.app.vault.read(this.currentFile);
            this.sendMessageToDrawio({ action: "load", xml: fileContent, autosave: 1 });
        } else {
            const emptyXml = "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>";
            this.sendMessageToDrawio({ action: "load", xml: emptyXml, autosave: 1 });
        }
    }

    private async handleExportMessage(svgDataUri: string) {
        await this.saveDiagramFromModal(svgDataUri);
    }

    private handleChangeMessage(xmlContent: string) {
        const baseEmptyXml = "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>";
        this.isEmptyDiagram = (!xmlContent || xmlContent === baseEmptyXml);
    }

    private async saveDiagramFromModal(svgDataUri: string) {
        if (!this.currentFile) {
            new Notice("❌ No file to save to in modal.");
            return;
        }

        let contentToSave: string;
        try {
            contentToSave = this.decodeSvgDataUri(svgDataUri);
        } catch (e: any) {
            new Notice(`❌ Failed to decode SVG content from modal: ${e.message}`);
            console.error("SVG decoding error in modal:", e);
            return;
        }

        try {
            await this.app.vault.modify(this.currentFile, contentToSave);
            new Notice(`💾 Diagram saved: ${this.currentFile.path}`);
            
            forceMarkdownViewUpdate(this.app, this.currentFile);
            
            this.isEmptyDiagram = this.isSvgContentActuallyEmpty(contentToSave);

        } catch (e) {
            new Notice(`❌ Failed to save diagram: ${this.currentFile.path}`);
            console.error("Error saving diagram in modal:", e);
        }
    }

    private decodeSvgDataUri(svgDataUri: string): string {
        if (svgDataUri.startsWith("data:image/svg+xml;base64,")) {
            const base64Part = svgDataUri.split(',')[1];
            return Buffer.from(base64Part, 'base64').toString('utf-8');
        } else if (svgDataUri.startsWith("data:image/svg+xml,")) {
            return decodeURIComponent(svgDataUri.split(',')[1]);
        } else {
            throw new Error("Invalid SVG data format received in modal.");
        }
    }

    private isSvgContentActuallyEmpty(content: string): boolean {
        const emptyDrawioXmlInSvgContent = `content="&lt;mxGraphModel&gt;&lt;root&gt;&lt;mxCell id=&quot;0&quot;/&gt;&lt;mxCell id=&quot;1&quot; parent=&quot;0&quot;/&gt;&lt;/root&gt;&lt;/mxGraphModel&gt;"`;
        const emptySvgStructureIndicator = `<g/>`;
        
        return content.includes(emptyDrawioXmlInSvgContent) &&
               content.includes(emptySvgStructureIndicator) &&
               (content.match(/<g\b[^>]*>/g) || []).length === 1 &&
               !content.includes('<path') &&
               !content.includes('<rect') &&
               !content.includes('<ellipse') &&
               !content.includes('<image') &&
               !content.includes('<text');
    }

    private async handleModalCloseBasedOnContent() {
        if (!this.currentFile) {
            return;
        }

        let currentFileContent = "";
        try {
            currentFileContent = await this.app.vault.read(this.currentFile);
        } catch (readError) {
            console.warn(`Could not read file ${this.currentFile.path} during modal close:`, readError);
            this.currentFile = null; // Файл мог быть удален или недоступен
            return;
        }

        const isFileContentEmpty = this.isSvgContentActuallyEmpty(currentFileContent);

        if (this.isEmptyDiagram || isFileContentEmpty) {
            try {
                const pathToDelete = this.currentFile.path;
                await this.app.fileManager.trashFile(this.currentFile);
                
                const editorContent = this.editor.getValue();
                const linkToDelete = `![[${pathToDelete}]]`;
                const linkToDeleteEncoded = `![[${encodeURI(pathToDelete)}]]`; // Учитываем закодированные пути

                if (editorContent.includes(linkToDelete)) {
                    this.editor.setValue(editorContent.replace(linkToDelete, ''));
                } else if (editorContent.includes(linkToDeleteEncoded)) {
                    this.editor.setValue(editorContent.replace(linkToDeleteEncoded, ''));
                }

            } catch (e) {
                if (!(e instanceof Error && e.message.toLowerCase().includes("file already deleted"))) {
                    new Notice(`❌ Failed to delete empty diagram file: ${this.currentFile.path}`);
                    console.error("Error deleting empty diagram file:", e);
                }
            }
        }
    }
}