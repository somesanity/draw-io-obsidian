import { DRAWIO_EDITOR_VIEW } from "consts";
import { CenteringEditorExtension } from "EditorExtensions/CenteringEditorExtension";
import { DeleteResizeBlockEditorExtension } from "EditorExtensions/DeleteResizeBlockEditorExtension";
import { PercentSizeEditorExtension } from "EditorExtensions/PercentSizeEditorExtension";
import DrawioPlugin from "main";
import { CenteringDiagrams } from "MarkdownPostProcessors/CenteringDiagram";
import { PercentSize } from "MarkdownPostProcessors/PercentSize";
import { Notice } from "obsidian";
import { SettingTab } from "Settings/settings";
import { DrawioEditorView } from "Views/DrawioEditorView";

export class PluginInit {
    private plugin: DrawioPlugin;

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin
    };

    async loadSettings(): Promise<void> {
        await this.plugin.loadSettings();
        this.plugin.addSettingTab(new SettingTab(this.plugin.app, this.plugin));
    }

    async addRibbonIcon(): Promise<any> {
        this.plugin.addRibbonIcon('dice', 'Sample', async (evt: MouseEvent) => {
            new Notice('This is a notice!');
            await this.plugin.drawioClientManager.checkAndUpdate();
            this.plugin.serverManager.startServer();
        })
    }

    async registerViews() {
        this.plugin.registerView(
            DRAWIO_EDITOR_VIEW,
            (leaf) => new DrawioEditorView(leaf, this.plugin)
        );
    }

    async registerCommands() {

        this.plugin.addCommand({
            id: "start-server",
            name: "Запустить сервер",
            callback: () => {
                this.plugin.serverManager.startServer();
            }
        })

        this.plugin.addCommand({
            id: "open-drawio-editor-view",
            name: "Запустить редактор draw.io",
            callback: async () => {
                this.plugin.serverManager.startServer();
                await this.plugin.activateView(DRAWIO_EDITOR_VIEW)
            }
        })
    }

    registerPostProcessings() {
        this.plugin.settings.centeringDiagrams
            ? CenteringDiagrams(this.plugin)
            : ""

        PercentSize(this.plugin)
    }

    registerEditorExtensions() {
        this.plugin.settings.centeringDiagrams
            ? this.plugin.registerEditorExtension(CenteringEditorExtension())
            : ""

        this.plugin.registerEditorExtension(DeleteResizeBlockEditorExtension())
        this.plugin.registerEditorExtension(PercentSizeEditorExtension())
    }
}
