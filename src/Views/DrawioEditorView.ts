import { DRAWIO_EDITOR_VIEW } from 'consts';
import DrawioPlugin from 'main';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { DrawioAppMessageController } from 'Utils/DrawioAppMessageController';
import { pluginUtils } from 'Utils/PluginUtils';

export class DrawioEditorView extends ItemView {
  plugin: DrawioPlugin
  Utils: pluginUtils
  drawioMessageController!: DrawioAppMessageController
  iframe!: HTMLIFrameElement
  private MessageListener!: Promise<(event: MessageEvent) => Promise<void>>;


  constructor(leaf: WorkspaceLeaf, plugin: DrawioPlugin) {
    super(leaf);
	  this.plugin = plugin
	  this.Utils = new pluginUtils(this.plugin)
  }

  getViewType() {
    return DRAWIO_EDITOR_VIEW;
  }

  getDisplayText() {
    return "редактор draw.io";
  }

  getIcon() {
    return 'shapes';
  }


  async onOpen() {
    const container = this.contentEl;

    this.iframe = container.createEl("iframe", {
      cls: "drawio-editor-view",
      attr: {
        src: this.Utils.getServerUrl("fullUrl"),
      }
    })

    this.drawioMessageController = new DrawioAppMessageController(this.plugin, this.iframe, this.Utils.getServerUrl("baseurl"))
    this.MessageListener = this.drawioMessageController.handleDrawIoMessage();
  }

  async onClose() {
    window.removeEventListener("message", await this.MessageListener)
  }
}