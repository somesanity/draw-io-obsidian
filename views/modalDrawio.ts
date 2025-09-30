import { App, Modal, Editor, TFile, Notice } from 'obsidian';
import DrawioPlugin from '../main';
import { forceMarkdownViewUpdate } from '../handlers/forceMarkdownViewUpdate';
import { t } from 'locales/i18n';

export class DrawioEmbedModal extends Modal {
    private editor?: Editor;
    private currentFile: TFile | null = null;
    private iframe: HTMLIFrameElement | null = null;
    private messageHandler: ((event: MessageEvent) => Promise<void>) | null = null;
    private plugin: DrawioPlugin;
    private isEmptyDiagram: boolean = true;
    private instanceId: string;
    private awaitingExport: boolean = false;

    constructor(app: App, plugin: DrawioPlugin, fileToEdit: TFile | null = null, editor?: Editor) {
        super(app);
        this.editor = editor;
        this.plugin = plugin;
        this.currentFile = fileToEdit;
        this.modalEl.addClass("drawio-embed-modal");
        const modalBg = this.containerEl.querySelector('.modal-bg');
        if (modalBg) {
            this.scope.register([], "Escape", () => false);
            modalBg.addEventListener('click', (e) => e.stopPropagation(), true);
        }
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.titleEl.setText(this.currentFile ? `${t('EditDiagraText')} ${this.currentFile.name}` : t('ModalNewDiagramCreateText'));
        if (this.currentFile) this.isEmptyDiagram = false;
        const isDarkTheme = document.body.hasClass("theme-dark");
        const drawioUrl = `http://localhost:${this.plugin.settings.port}/?embed=1&proto=json&libraries=1&spin=1&splash=0` + (isDarkTheme ? `&ui=dark&dark=1` : `&ui=atlas`);
        this.iframe = contentEl.createEl("iframe", { attr: { src: drawioUrl } });
        this.iframe.addClass('drawioIframe');
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
        const folderPath = this.plugin.settings.Folder;
        try {
            await this.app.vault.createFolder(folderPath);
        } catch (e: any) {
            if (!e.message.includes("Folder already exists")) {
                new Notice(`❌ ${t('FailedCreateFolder')}`);
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
            return await this.app.vault.create(fullPath, emptySvgContent);
        } catch (e) {
            new Notice(`❌ ${t('FailedCreateNewDiagram')}: ${fullPath}`);
            console.error("Error creating new diagram file:", e);
            return null;
        }
    }

    private createMessageHandler(): (event: MessageEvent) => Promise<void> {
    return async (event: MessageEvent) => {
        const expectedOrigin = `http://localhost:${this.plugin.settings.port}`;
        if (event.origin !== expectedOrigin) return;

        try {
            if (this.iframe && event.source !== this.iframe.contentWindow) {
                return;
            }
        } catch (e) {
            console.debug("Warning: couldn't compare event.source to iframe.contentWindow", e);
        }

        let msg: any;
        try {
            msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        } catch (e) {
            console.warn("Could not parse Draw.io message:", event.data, e);
            return;
        }

        if (msg.instance && msg.instance !== this.instanceId) return;

        switch (msg.event) {
            case "init":
                await this.handleInitMessage();
                break;
            case "save":
                if (this.awaitingExport) return;
                this.awaitingExport = true;
                this.sendMessageToDrawio({ action: "export", format: "xmlsvg", xml: 1 });
                setTimeout(() => { this.awaitingExport = false; }, 5000);
                break;
            case "export":
                this.awaitingExport = false;
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
        let contentToSave: string;
        try {
            contentToSave = this.decodeSvgDataUri(svgDataUri);
        } catch (e: any) {
            new Notice(`❌ ${t('FailedDecodeSvg')} ${e.message}`);
            return;
        }
        if (this.isSvgContentActuallyEmpty(contentToSave)) {
            new Notice(`${t('NotSaveEmptyDiagram')}`);
            return;
        }
        if (!this.currentFile) {
            const newFile = await this.handleNewDiagramCreation();
            if (!newFile) return;
            this.currentFile = newFile;
            this.titleEl.setText(`${t('EditDiagraText')} ${this.currentFile.name}`);
            const defaultWidth = this.plugin.settings.diagramSize;
            let embedLink: string;        
            if (this.plugin.settings.useMarkdownLinks) {
                const alt = defaultWidth?.trim() ?? "";
                const relativePath = this.currentFile.path;
                embedLink = `![${alt}](${relativePath})`;
            } else {
                embedLink = defaultWidth?.trim()
                    ? `![[${this.currentFile.path}|${defaultWidth.trim()}]]`
                    : `![[${this.currentFile.path}]]`;
            }
            if (this.editor) {
                setTimeout(() => {
                    this.editor!.replaceSelection(embedLink);
                }, 500);
            }
        }
        try {
            await this.app.vault.modify(this.currentFile, contentToSave);
            new Notice(`💾 ${t('saveDiagram')} ${this.currentFile.path}`);
            await forceMarkdownViewUpdate(this.app, this.currentFile);
            this.isEmptyDiagram = false;
        } catch (e) {
            new Notice(`❌ ${t('FailedToSaveDiagram')} ${this.currentFile.path}`);
            console.error("Error saving diagram:", e);
        }
    }

    private decodeSvgDataUri(svgDataUri: string): string {
        if (svgDataUri.startsWith("data:image/svg+xml;base64,")) {
            const base64Part = svgDataUri.split(',')[1];
            return Buffer.from(base64Part, 'base64').toString('utf-8');
        } else if (svgDataUri.startsWith("data:image/svg+xml,")) {
            return decodeURIComponent(svgDataUri.split(',')[1]);
        } else {
            throw new Error(`${t('ErrorValidSvgData')}`);
        }
    }

    private isSvgContentActuallyEmpty(content: string): boolean {
        const emptyDrawioXmlInSvgContent = `content="&lt;mxGraphModel&gt;&lt;root&gt;&lt;mxCell id=&quot;0&quot;/&gt;&lt;mxCell id=&quot;1&quot; parent=&quot;0&quot;/&gt;&lt;/root&gt;&lt;/mxGraphModel&gt;"`;
        return content.includes(emptyDrawioXmlInSvgContent) && (content.match(/<g\b[^>]*>/g) || []).length === 1;
    }

    private async handleModalCloseBasedOnContent() {
        if (!this.currentFile || !this.editor) return;
        if (this.isEmptyDiagram) {
            try {
                const pathToDelete = this.currentFile.path;
                await this.app.fileManager.trashFile(this.currentFile);
                const editorContent = this.editor.getValue();
                const linkToDeleteSimple = `![[${pathToDelete}]]`;
                let finalContent = editorContent.replace(linkToDeleteSimple, '');
                const linkWithModifierRegex = new RegExp(`!\\[\\[${pathToDelete.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\|[^\\]]+\\]\\]`, 'g');
                finalContent = finalContent.replace(linkWithModifierRegex, '');
                if (finalContent !== editorContent) {
                    this.editor.setValue(finalContent);
                }
            } catch (e) {
                if (!(e instanceof Error && e.message.toLowerCase().includes("file already deleted"))) {
                    new Notice(`❌ ${t('FailedDeleteEmptyDiagram')} ${this.currentFile.path}`);
                }
            }
        }
    }
}