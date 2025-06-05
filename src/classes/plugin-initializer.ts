import { Plugin, Editor, Menu, MarkdownView, TFile, Notice } from "obsidian";
import { DrawioEmbedModal } from "./DrawioEmbedModal";

import { handleDiagramClick } from "../handlers/handleDiagramClick"; 

import type DrawIOPlugin from "../../main"; 
import { DRAWIO_VIEW } from "../constants";
import { DrawIOView } from "./drawio-view";
import { DrawioSettingTab } from "./settings/settings-tab";
import { findDiagramFileUnderCursor } from "../utils/findDiagramFileUnderCursor"; 

export class PluginInitializer {
    private plugin: DrawIOPlugin; 

    constructor(plugin: DrawIOPlugin) {
        this.plugin = plugin;
    }

    public initialize(): void {
        this.registerViews();
        this.addRibbonIcon();
        this.addCommands();
        this.registerEvents();
        this.addSettingTab();

        this.plugin.app.workspace.onLayoutReady(() => {
            new Notice("✅ Draw.io plugin loaded");
        });
    }

    private registerViews(): void {
        this.plugin.registerView(DRAWIO_VIEW, (leaf) => new DrawIOView(leaf, this.plugin));
    }

    private addRibbonIcon() {
        this.plugin.addRibbonIcon("shapes", "Open Draw.io", async () => {
        await this.plugin.launchDrawioServer();
        const leaf = this.plugin.app.workspace.getLeaf(true);
        await leaf.setViewState({
            type: DRAWIO_VIEW,
            active: true,
        });
        })

    }

    private addCommands(): void {
        this.plugin.addCommand({
            id: 'drawio-create-or-edit',
            name: 'Create or edit Draw.io diagram',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const fileToEdit = findDiagramFileUnderCursor(this.plugin.app, editor, view); 
                await this.plugin.launchDrawioServer(); 

                if (fileToEdit) {
                    new DrawioEmbedModal(this.plugin.app, editor, this.plugin, fileToEdit).open();
                } else {
                    new DrawioEmbedModal(this.plugin.app, editor, this.plugin).open();
                }
            }
        });
    }

    private registerEvents(): void {
        this.plugin.registerEvent(
            this.plugin.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
                const fileToEdit = findDiagramFileUnderCursor(this.plugin.app, editor, view); 
                
                const openDrawioModal = async (file?: TFile) => {
                    await this.plugin.launchDrawioServer(); 
                    new DrawioEmbedModal(this.plugin.app, editor, this.plugin, file).open();
                };

                if (fileToEdit) {
                    menu.addItem((item) => {
                        item
                            .setTitle(`Edit ${fileToEdit.basename}`)
                            .setIcon("pencil")
                            .setSection("drawio-actions")
                            .onClick(() => openDrawioModal(fileToEdit));
                    });
                } else {
                    menu.addItem((item) => {
                        item
                            .setTitle("Embed New Draw.io Diagram")
                            .setIcon("shapes")
                            .setSection("drawio-actions")
                            .onClick(() => openDrawioModal());
                    });
                }
            })
        );
        this.plugin.registerDomEvent(document, "click", (event: MouseEvent) => 
            handleDiagramClick(event, this.plugin.app, this.plugin)
        );
    }

    private addSettingTab(): void {
        this.plugin.addSettingTab(new DrawioSettingTab(this.plugin.app, this.plugin));
    }
}