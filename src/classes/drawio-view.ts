// src/drawio-view.ts

import { ItemView, WorkspaceLeaf, Notice, TFile, App } from "obsidian";
import type DrawIOPlugin from "../../main";
import { DRAWIO_VIEW } from "../constants";
import { handleDrawioMessage } from "../handlers/handlerDrawMessage";

export class DrawIOView extends ItemView {
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
                src: `http://localhost:${this.plugin.settings.port}/?embed=1&proto=json&libraries=1&spin=1&ui=dark&dark=1&splash=0`,
                
            },
        });

        this.iframe.addEventListener("dragover", this.handleDragOver.bind(this));
        this.iframe.addEventListener("dragleave", this.handleDragLeave.bind(this));
        this.iframe.addEventListener("drop", this.handleDrop.bind(this));
        this.iframe.addEventListener("dragenter", this.handleDragEnter.bind(this));

        const messageHandler = async (event: MessageEvent) => {
            if (event.origin !== `http://localhost:${this.plugin.settings.port}`) return;
            let msg;
            try {
                msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
            } catch (e) { return; }
            
            await handleDrawioMessage(msg, event.source as Window, this.app, this, this.plugin);
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
    }

    public sendMessageToDrawio(message: object) {
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(JSON.stringify(message), `http://localhost:${this.plugin.settings.port}`);
        }
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
}