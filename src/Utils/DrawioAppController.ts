import DrawioPlugin from "main";
import { pluginUtils } from "./PluginUtils";
import { normalizePath, TFile } from "obsidian";
import { get } from "http";

export class DrawioAppController {

  private plugin: DrawioPlugin
  private iframe: HTMLIFrameElement
  private url: string
  private Utils: pluginUtils

  public file: TFile | null = null
  public fileName: string | null = null

  constructor(plugin: DrawioPlugin, iframe: HTMLIFrameElement, url: string) {
    this.plugin = plugin
    this.iframe = iframe
    this.url = url;
    this.Utils = new pluginUtils(this.plugin)
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

    if (this.file && this.fileName && await this.plugin.app.vault.adapter.exists(this.fileName)) {
      const file = this.plugin.app.vault.getFileByPath(this.fileName)

      this.Utils.refreshLeaves();
      return await this.plugin.app.vault.modify(file!, svg);
    }

    this.fileName = await this.Utils.getFileNameForSave()

    await this.plugin.app.vault.create(this.fileName, svg);
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