import { DRAWIO_EDITOR_VIEW } from "consts";
import { CenteringEditorExtension } from "EditorExtensions/CenteringEditorExtension";
import { DeleteResizeBlockEditorExtension } from "EditorExtensions/DeleteResizeBlockEditorExtension";
import { PercentSizeEditorExtension } from "EditorExtensions/PercentSizeEditorExtension";
import DrawioPlugin from "main";
import { CenteringDiagrams } from "MarkdownPostProcessors/CenteringDiagram";
import { interactiveDiagramss } from "MarkdownPostProcessors/interactiveDiagrams";
import { PercentSize } from "MarkdownPostProcessors/PercentSize";
import { Editor, MarkdownView, Menu, Notice, TFile } from "obsidian";
import { SettingTab } from "Settings/settings";
import { DrawioEditorView } from "Views/DrawioEditorView";
import { ExternalLinkTooltip } from "./ExternalLinkTooltip";
import { pluginUtils } from "./PluginUtils";

export class PluginInit {
    private plugin: DrawioPlugin;
    private utils: pluginUtils;

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin
        this.utils = new pluginUtils(this.plugin)
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

        this.plugin.addCommand({
            id: 'open-drawio-under-cursor',
            name: 'Открыть Draw.io диаграмму под курсором',
            hotkeys: [{ modifiers: ["Mod", "Alt"], key: "e" }], // По умолчанию Ctrl+Alt+E (или Cmd+Alt+E)

            // editorCallback работает только тогда, когда фокус находится в текстовом редакторе
            editorCallback: (editor: Editor, view: MarkdownView) => {
                // Используем вашу утилиту для поиска файла под курсором
                const fileToEdit = this.utils.findDiagramFileUnderCursor(this.plugin.app, editor, view);

                if (fileToEdit && fileToEdit.name.endsWith('.drawio.svg')) {
                    // Триггерим активацию вашей вьюшки
                    this.plugin.activateView(DRAWIO_EDITOR_VIEW, { file: fileToEdit });
                }
            }
        });
    }

    registerPostProcessings() {
        this.plugin.settings.centeringDiagrams
            ? CenteringDiagrams(this.plugin)
            : ""

        PercentSize(this.plugin)

        this.plugin.settings.interactiveDiagrams
            ? interactiveDiagramss(this.plugin)
            : ""
    }

    registerEditorExtensions() {
        this.plugin.settings.centeringDiagrams
            ? this.plugin.registerEditorExtension(CenteringEditorExtension())
            : ""

        this.plugin.registerEditorExtension(DeleteResizeBlockEditorExtension())
        this.plugin.registerEditorExtension(PercentSizeEditorExtension())
    }

    registerEvents() {

        this.plugin.registerEvent(
            this.plugin.app.workspace.on('drawio:edit-diagram', (file: TFile) => {

                this.plugin.activateView(DRAWIO_EDITOR_VIEW, { file: file });
            })
        );

        this.plugin.registerEvent(
            this.plugin.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
                const fileToEdit = this.utils.findDiagramFileUnderCursor(this.plugin.app, editor, view);

                if (fileToEdit && fileToEdit.name.endsWith('.drawio.svg')) {
                    menu.addItem((item) => {
                        item
                            .setTitle("Редактировать Draw.io диаграмму")
                            .setIcon("shapes")
                            .onClick(() => {
                                this.plugin.app.workspace.trigger('drawio:edit-diagram', fileToEdit);
                            });
                    });
                }
            })
        );

    }

}