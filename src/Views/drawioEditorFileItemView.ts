import { DRAWIO_EDITOR_VIEW, DRAWIO_EDITOR_VIEW_FILE_ITEM_TYPE, DRAWIO_EXTENSION } from 'consts';
import DrawioPlugin from 'main';
import { FileView, TFile, ViewStateResult, WorkspaceLeaf } from 'obsidian';
import { DrawioAppController } from 'Utils/DrawioAppController';
import { pluginUtils } from 'Utils/PluginUtils';

export class drawioEditorFileItemView extends FileView {
    plugin: DrawioPlugin;
    Utils: pluginUtils;
    drawioAppController!: DrawioAppController;
    states: any = {};

    private iframe!: HTMLIFrameElement;
    private MessageListener!: (event: MessageEvent) => Promise<void>;

    constructor(leaf: WorkspaceLeaf, plugin: DrawioPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.Utils = new pluginUtils(this.plugin);
    }

    async setState(state: any, result: ViewStateResult): Promise<void> {
        await super.setState(state, result);
        this.states = state;

        if (this.iframe) {
            this.applyOptions();
        }
    }

    private applyOptions() {
        if (!this.states) return;
    }

    public getState() {
        return this.states;
    }

    getViewType() {
        return DRAWIO_EDITOR_VIEW_FILE_ITEM_TYPE;
    }

    getDisplayText() {
        if (this.file) {
            return this.file.name.replace(DRAWIO_EXTENSION, '');
        }
        return "редактор draw.io";
    }

    getIcon() {
        return 'shapes';
    }

    async onLoadFile(file: TFile): Promise<void> {
        await super.onLoadFile(file);

        if (this.drawioAppController) {
            this.drawioAppController.file = file;
        }

        this.iframe.addEventListener('load', () => {
            console.log(`Файл ${file.name} отправлен в Draw.io контроллер`);
            this.drawioAppController.file = file;
        }, { once: true });
    }

    async onOpen() {
        if (!this.plugin.server) {
            this.plugin.serverManager.startServer();
        }

        const container = this.contentEl;
        container.empty();

        this.iframe = container.createEl("iframe", {
            cls: "drawio-editor-item-file-view",
            attr: {
                src: this.Utils.getServerUrl("fullUrl"),
                sandbox: "allow-forms allow-modals allow-popups allow-scripts allow-same-origin",
            }
        });

        this.drawioAppController = new DrawioAppController(
            this.plugin,
            this.iframe,
            this.Utils.getServerUrl("baseurl"),
            this.leaf
        );

        this.MessageListener = await this.drawioAppController.handleDrawIoMessage();
        window.addEventListener("message", this.MessageListener);
    }

    async onClose() {
        if (this.MessageListener) {
            window.removeEventListener("message", this.MessageListener);
        }
        this.contentEl.empty();
    }
}