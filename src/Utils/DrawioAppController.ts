import DrawioPlugin from "main";
import { pluginUtils } from "./PluginUtils";

export class DrawioAppController {

  private plugin: DrawioPlugin
  private iframe: HTMLIFrameElement
  private url: string
  private Utils: pluginUtils

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

        const data = JSON.parse(event.data);

        switch(data.event) {
          case "init": this.onInit(data) 
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

  onInit(data: any) {
      const messageToDrawIo = {
        action: 'load',
        xml: ""
      };

      this.iframe.contentWindow?.postMessage(JSON.stringify(messageToDrawIo), "http://localhost:4444");
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

      if(this.fileName && await this.plugin.app.vault.adapter.exists(this.fileName)) {
        const file = this.plugin.app.vault.getFileByPath(this.fileName)
        return await this.plugin.app.vault.modify(file!, svg);
      }

      this.fileName = this.Utils.getFileNameForSave()

      await this.plugin.app.vault.create(this.fileName, svg);
    }
}