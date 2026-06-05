import DrawioPlugin from "main";
import { pluginUtils } from "./PluginUtils";
import { normalizePath, TFile, WorkspaceLeaf, Notice } from "obsidian";
import { t } from "locales/I18n";

export class DrawioAppController {

  private plugin: DrawioPlugin
  private iframe: HTMLIFrameElement
  private url: string
  private Utils: pluginUtils

  public file: TFile | null = null
  public fileName: string | null = null

  private leaf?: WorkspaceLeaf | null;

  constructor(plugin: DrawioPlugin, iframe: HTMLIFrameElement, url: string, leaf?: WorkspaceLeaf) {
    this.plugin = plugin
    this.iframe = iframe
    this.url = url;
    this.Utils = new pluginUtils(this.plugin)
    this.leaf = leaf ? leaf : null;
  }

  async handleDrawIoMessage() {
    const listener = async (event: MessageEvent) => {
      if (event.origin !== this.url) { return; }

      if (!this.iframe || event.source !== this.iframe.contentWindow) { return; }

      const data = JSON.parse(event.data);

      switch (data.event) {
        case "init": this.onInit()
          break
        case "save": this.onSaveData(data)
          break
        case "export": this.onExportData(data)
          break
      }
    }

    window.addEventListener("message", listener);

    return listener;
  }

  async onInit() {
    const messageToDrawIo = {
      action: 'load',
      xml: ""
    };

    if (this.file) {
      const data = await this.plugin.app.vault.read(this.file);

      const messageToEditDrawIo = {
        action: 'load',
        xml: data
      };

      this.fileName = normalizePath(this.file.path);

      return this.iframe.contentWindow?.postMessage(JSON.stringify(messageToEditDrawIo), this.Utils.getServerUrl("baseurl"));
    }

    return this.iframe.contentWindow?.postMessage(JSON.stringify(messageToDrawIo), this.Utils.getServerUrl("baseurl"));
  }

  onSaveData(data: any) {
    this.iframe.contentWindow?.postMessage(JSON.stringify({
      action: 'export',
      format: 'xmlsvg',
    }), this.url);
  }

  async onExportData(data: any) {
    const svgString = data.data.split(',')[1];
    const svg = decodeURIComponent(escape(atob(svgString)));

    if (this.file && await this.plugin.app.vault.adapter.exists(this.file.path)) {
      let file = this.plugin.app.vault.getFileByPath(this.file.path);

      if (file) {
        if (file.path.endsWith('.drawio')) {
          const newPath = file.path.substring(0, file.path.lastIndexOf('.drawio')) + '.drawio.svg';
          await this.plugin.app.vault.rename(file, newPath);

          this.file = file;
        }

        await this.plugin.app.vault.modify(file, svg);

        new Notice(t("DRAWIO_NOTICE__DIAGRAM_SAVED").replace("{name}", file.name));
        this.Utils.refreshLeaves();
        return;
      }
    }

    const newFileName = await this.Utils.getFileNameForSave();
    if (!newFileName) return;

    const file = await this.plugin.app.vault.create(newFileName, svg);
    this.file = file;

    new Notice(t("DRAWIO_NOTICE__DIAGRAM_CREATED").replace("{name}", file.name));

    if (this.leaf) {
      const currentStatus = this.leaf.getViewState();

      await this.leaf.setViewState({
        ...currentStatus,
        state: {
          ...currentStatus.state,
          file: file
        }
      }, { history: false });
    }
  }

  public set setFiletoEdit(file: TFile) {
    this.file = file;
  }

  public get setFiletoEdit(): TFile | null {
    if (this.file) {
      return this.file;
    }

    return null;
  }
}