import DrawioPlugin from 'main';
import { App, Editor, Modal, TFile } from 'obsidian';
import { DrawioAppController } from 'Utils/DrawioAppController';
import { pluginUtils } from 'Utils/PluginUtils';

export class DrawioEditorModal extends Modal {

    private plugin: DrawioPlugin
    private iframe!: HTMLIFrameElement;
    private utils: pluginUtils;
    private drawioAppController!: DrawioAppController;
    private MessageListener!: Promise<(event: MessageEvent) => Promise<void>>;
    private file!: TFile | null
    private editor!: Editor;

    constructor(app: App, plugin: DrawioPlugin, file?: TFile | null) {
        super(app);
        this.plugin = plugin
        this.utils = new pluginUtils(this.plugin)
        this.file = file ? this.file = file : null;
    }

    onOpen(): Promise<void> | void {

        if (!this.plugin.server) this.plugin.serverManager.startServer();

        const { contentEl } = this;
        contentEl.empty();
        this.iframe = contentEl.createEl("iframe", { attr: { src: this.utils.getServerUrl("fullUrl") } });


        const modal = this.containerEl.querySelector(".modal");

        modal?.addClass("drawioModalEditor")
        this.iframe.addClass('drawioModalEditorIframe');

        this.drawioAppController = new DrawioAppController(this.plugin, this.iframe, this.utils.getServerUrl("baseurl"))

        if (this.file) {
            this.drawioAppController.file = this.file;
        }

        this.MessageListener = this.drawioAppController.handleDrawIoMessage();
    }

    async onClose() {
        window.removeEventListener("message", await this.MessageListener)
    }
}