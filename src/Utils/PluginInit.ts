import { DRAWIO_EDITOR_VIEW, DRAWIO_EDITOR_VIEW_FILE_ITEM_TYPE } from "consts";
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
import { pluginUtils } from "./PluginUtils";
import { SizeInHoverWindow } from "MarkdownPostProcessors/SizeInhoverWindow";
import { setClassToDiagrams } from "MarkdownPostProcessors/setClassToDiagrams";
import { setDiagramsTheme } from "MarkdownPostProcessors/setDiagramTheme";
import { SetClassToDiagramsEditorExtension } from "EditorExtensions/setClassToDiagramsEditorExtension";
import { setDiagramThemeEditorExtension } from "EditorExtensions/setDiagramThemeEditorExtension";
import { CanvasManager } from "./CanvasManager";
import { DrawioEditorModal } from "Views/DrawioEditorModal";
import { drawioEditorFileItemView } from "Views/drawioEditorFileItemView";
import { setLocale, t } from "locales/I18n";

export class PluginInit {
    private plugin: DrawioPlugin;
    private utils: pluginUtils;
    public canvasManager: CanvasManager

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin
        this.utils = new pluginUtils(this.plugin)
        this.canvasManager = new CanvasManager(this.plugin);
    };

    async loadSettings(): Promise<void> {
        await this.plugin.loadSettings();
        this.plugin.addSettingTab(new SettingTab(this.plugin.app, this.plugin));
    }

    async addRibbonIcon(): Promise<any> {
        this.plugin.addRibbonIcon('shapes', t("DRAWIO_RIBBON__TOOLTIP"), async (evt: MouseEvent) => {
            this.plugin.activateView(DRAWIO_EDITOR_VIEW);
        })
    }

    async registerViews() {
        this.plugin.registerView(
            DRAWIO_EDITOR_VIEW,
            (leaf) => new DrawioEditorView(leaf, this.plugin)
        );

        this.plugin.registerView(
            DRAWIO_EDITOR_VIEW_FILE_ITEM_TYPE,
            (leaf) => new drawioEditorFileItemView(leaf, this.plugin)
        );
    }

    async registerCommands() {

        this.plugin.addCommand({
            id: "start-server",
            name: t("DRAWIO_COMMAND__START_SERVER"),
            callback: () => {
                this.plugin.serverManager.startServer();
            }
        })

        this.plugin.addCommand({
            id: "open-drawio-editor-view",
            name: t("DRAWIO_COMMAND__OPEN_DRAWIO_EDITOR"),
            callback: async () => {
                this.plugin.serverManager.startServer();
                await this.plugin.activateView(DRAWIO_EDITOR_VIEW)
            }
        })

        this.plugin.addCommand({
            id: 'open-drawio-under-cursor',
            name: t("DRAWIO_COMMAND__OPEN_DIAGRAM_UNDER_CURSOR"),
            hotkeys: [{ modifiers: ["Mod", "Alt"], key: "e" }],

            editorCallback: (editor: Editor, view: MarkdownView) => {
                const fileToEdit = this.utils.findDiagramFileUnderCursor(this.plugin.app, editor, view);

                if (fileToEdit && fileToEdit.name.endsWith('.drawio.svg')) {
                    this.plugin.activateView(DRAWIO_EDITOR_VIEW, { file: fileToEdit });
                } else {
                    this.plugin.activateView(DRAWIO_EDITOR_VIEW);
                }
            }
        });

        this.plugin.addCommand({
            id: 'open-editor-in-modal',
            name: t("DRAWIO_COMMAND__OPEN_MODAL_DRAWIO_EDITOR"),
            callback: () => {
                new DrawioEditorModal(this.plugin.app, this.plugin).open();
            },
        });

        this.plugin.addCommand({
            id: 'open-drawio-under-cursor-in-modal',
            name: t("DRAWIO_COMMAND__OPEN_DIAGRAM_UNDER_CURSOR_IN_MODAL"),
            hotkeys: [{ modifiers: ["Mod", "Alt"], key: "m" }],

            editorCallback: (editor: Editor, view: MarkdownView) => {
                const fileToEdit = this.utils.findDiagramFileUnderCursor(this.plugin.app, editor, view);

                if (fileToEdit && fileToEdit.name.endsWith('.drawio.svg')) {
                    const modal = new DrawioEditorModal(this.plugin.app, this.plugin, fileToEdit)
                    modal.open();
                }
            }
        });
    }

    registerPostProcessings() {
        setClassToDiagrams(this.plugin);
        setDiagramsTheme(this.plugin);

        this.plugin.settings.centeringDiagrams
            ? CenteringDiagrams(this.plugin)
            : ""

        PercentSize(this.plugin)

        // this.plugin.settings.interactiveDiagrams
        //     ? interactiveDiagramss(this.plugin)
        //     : ""

        SizeInHoverWindow(this.plugin);
        this.canvasManager.init();
    }

    registerEditorExtensions() {
        this.plugin.registerEditorExtension(SetClassToDiagramsEditorExtension());
        this.plugin.registerEditorExtension(setDiagramThemeEditorExtension(this.plugin));


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
            this.plugin.app.workspace.on('drawio:copy-diagram-as-image', (file: TFile) => {

                this.utils.copySvgAsPng(file)
            })
        );

        this.plugin.registerEvent(
            this.plugin.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
                const fileToEdit = this.utils.findDiagramFileUnderCursor(this.plugin.app, editor, view);

                if (fileToEdit && fileToEdit.name.endsWith('.drawio.svg')) {
                    menu.addItem((item) => {
                        item
                            .setTitle(t("DRAWIO_MENU__EDIT_DIAGRAM"))
                            .setIcon("shapes")
                            .onClick(() => {
                                this.plugin.app.workspace.trigger('drawio:edit-diagram', fileToEdit);
                            });
                    });
                }
            })
        );

        this.plugin.registerEvent(
            this.plugin.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
                const file = this.utils.findDiagramFileUnderCursor(this.plugin.app, editor, view);

                if (file && file.name.endsWith('.drawio.svg')) {
                    menu.addItem((item) => {
                        item
                            .setTitle(t("DRAWIO_MENU__COPY_AS_IMAGE"))
                            .setIcon("copy")
                            .onClick(() => {
                                this.plugin.app.workspace.trigger('drawio:copy-diagram-as-image', file);
                            });
                    });
                }
            })
        );
    }

    registerExtensions() {
        this.plugin.registerExtensions(["drawio"], DRAWIO_EDITOR_VIEW_FILE_ITEM_TYPE);
    }

    setPluginLanguage() {
        const userLang = (window.localStorage.getItem('language') || 'en').split('-')[0];
        setLocale(userLang ? userLang : "en");
    }
}