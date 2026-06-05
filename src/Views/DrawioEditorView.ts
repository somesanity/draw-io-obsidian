import { DRAWIO_EDITOR_VIEW, DRAWIO_EXTENSION } from 'consts';
import { t } from 'locales/I18n';
import DrawioPlugin from 'main';
import { ItemView, TFile, ViewStateResult, WorkspaceLeaf } from 'obsidian';
import { DrawioAppController } from 'Utils/DrawioAppController';
import { pluginUtils } from 'Utils/PluginUtils';

export class DrawioEditorView extends ItemView {
  plugin: DrawioPlugin
  Utils: pluginUtils
  drawioAppController!: DrawioAppController
  states: any = {};

  private iframe!: HTMLIFrameElement
  private MessageListener!: Promise<(event: MessageEvent) => Promise<void>>;

  constructor(leaf: WorkspaceLeaf, plugin: DrawioPlugin) {
    super(leaf);
    this.plugin = plugin
    this.Utils = new pluginUtils(this.plugin)
  }

  async setState(state: any, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);

    this.states = state;

    if (this.drawioAppController && this.states?.file) {
      this.drawioAppController.file = this.states.file as TFile;
    }

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
    return DRAWIO_EDITOR_VIEW;
  }

  getDisplayText() {
    if (this.states.file) {
      return this.states.file.name.replace(DRAWIO_EXTENSION, '');
    }

    return t("DRAWIOEDITOR_VIEW_NAME");
  }

  getIcon() {
    return 'shapes';
  }


  async onOpen() {
    if (!this.plugin.server) {
      this.plugin.serverManager.startServer();
    }

    const container = this.contentEl;

    this.iframe = container.createEl("iframe", {
      cls: "drawio-editor-view",
      attr: {
        src: this.Utils.getServerUrl("fullUrl"),
      }
    })

    this.drawioAppController = new DrawioAppController(this.plugin, this.iframe, this.Utils.getServerUrl("baseurl"), this.leaf)

    this.MessageListener = this.drawioAppController.handleDrawIoMessage();
  }

  async onClose() {
    window.removeEventListener("message", await this.MessageListener)
  }
}