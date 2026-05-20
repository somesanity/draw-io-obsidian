import DrawioPlugin from "main";

export class DrawioAppMessageController {

  private plugin: DrawioPlugin
  private iframe: HTMLIFrameElement
  private url: string

  constructor(plugin: DrawioPlugin, iframe: HTMLIFrameElement, url: string) {
    this.plugin = plugin
    this.iframe = iframe
    this.url = url;
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
      console.log('Draw.io говорит: Я загрузился!');

      const messageToDrawIo = {
        action: 'load',
        xml: ""
      };

      this.iframe.contentWindow?.postMessage(JSON.stringify(messageToDrawIo), "http://localhost:4444");
  }

  onSaveData(data: any) {
      console.log(data.xml)

      this.iframe.contentWindow?.postMessage(JSON.stringify({
          action: 'export',
          format: 'xmlsvg',
        }), this.url);
  }

  async onExportData(data: any) {
      console.log(data.data)

      const svgString = data.data.split(',')[1];
      const svg = decodeURIComponent(escape(atob(svgString)));
      await this.plugin.app.vault.create("file.svg", svg)
      console.log(svg)
    }
}