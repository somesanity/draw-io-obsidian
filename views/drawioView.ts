import { App, FileSystemAdapter, ItemView, TFile, WorkspaceLeaf } from 'obsidian';

import { DRAWIOVIEW } from 'consts';
import { t } from 'locales/i18n';
import DrawioPlugin from 'main'; // Make sure to import DrawioPlugin
import { DEFAULT_SETTINGS } from 'settings/Settings';
import { folderExists } from 'utils/folderExists';

export class Drawioview extends ItemView {
    public iframe: HTMLIFrameElement | null = null;
    private messageHandler: (event: MessageEvent) => void;
    public plugin: DrawioPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: DrawioPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.messageHandler = this.listendrawiomessage.bind(this);
    }

    getViewType() {
        return DRAWIOVIEW;
    }

    getDisplayText() {
        return t("DrawIoViewName");
    }

    async onOpen() {
        const container = this.containerEl.children[1];

        container.empty();
        container.createEl('iframe', {attr: {id: 'drawioiframe', src: `http://localhost:${this.plugin.settings.port}?embed=1&proto=json&ui=dark`}})
          .addClass('drawioIframe')
        this.iframe = document.getElementById('drawioiframe') as HTMLIFrameElement;
        window.addEventListener('message', this.messageHandler);
    }

    async listendrawiomessage(event: MessageEvent) {
        try {
            const msg = JSON.parse(event.data);
            
            switch (msg.event) {
                case 'init':
                    this.iframe?.contentWindow?.postMessage(JSON.stringify({
                        action: 'load',
                        xml: '<mxGraphModel><root>...</root></mxGraphModel>',
                        title: 'example.drawio'
                    }), `http://localhost:${this.plugin.settings.port}`);
                    break;

                case 'save':
                this.iframe?.contentWindow?.postMessage(JSON.stringify({
                    action: 'export',
                    format: "xmlsvg",
                    xml: 1,
                    }), `http://localhost:${this.plugin.settings.port}`);       
                    break;

                case "export": {
                    const svgBase64 = msg.data;
                    const svg64Data = svgBase64.replace(/^data:image\/svg\+xml;base64,/, '')
                    const svgContent = atob(svg64Data);

                    const now = new Date();
                    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
                    
                    if(folderExists(this.app, this.plugin.settings.Folder)) {
                        this.app.vault.create(`${this.plugin.settings.Folder}/drawio_${timestamp}.drawio.svg`, svgContent)
                    } else {
                        this.app.vault.create(`/drawio_${timestamp}.drawio.svg`, svgContent)
                    }


                    break;
                }

                case 'exit':
                    break;
            }
        } catch (e) {
            console.warn('Некорректный JSON в сообщении:', event.data);
        }
    }

    async onClose() {
        window.removeEventListener('message', this.messageHandler);
    }
}