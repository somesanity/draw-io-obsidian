import { Editor, ItemView, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { DRAWIOVIEW } from 'consts';
import { t } from 'locales/i18n';
import DrawioPlugin from 'main';
import { forceMarkdownViewUpdate } from 'handlers/forceMarkdownViewUpdate';

export class Drawioview extends ItemView {
    public iframe: HTMLIFrameElement | null = null;
    private messageHandler: (event: MessageEvent) => void;
    public plugin: DrawioPlugin;
    public currentFile: TFile | null = null;
    public fileName: string | null = null;
    private instanceId: string;
    private awaitingExport: boolean = false;
    constructor(leaf: WorkspaceLeaf, plugin: DrawioPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.messageHandler = this.listendrawiomessage.bind(this);
        this.instanceId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
            ? (crypto as any).randomUUID()
            : `inst_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
        this.fileName = this.fileName;
        }

    getViewType() {
        return DRAWIOVIEW;
    }

    getDisplayText() {
        if(this.fileName) {
            return `${this.fileName}`;
        } else {
            return t("DrawIoViewName");
        }
    }
    
    getIcon() {
        return 'shapes';
    }

    async onOpen() {
        const container = this.containerEl.children[1] as any;
        container.empty();
        this.currentFile = null;

        const theme = (this.app.vault as any).config?.theme || 'system';
        const systemAppearanceIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        let drawioUi: string;
        let drawioDark: number;

        if (theme === 'system') {
            drawioUi = systemAppearanceIsDark ? 'dark' : 'kennedy';
            drawioDark = systemAppearanceIsDark ? 1 : 0;
        } else if (theme === 'obsidian') {
            drawioUi = 'dark';
            drawioDark = 1;
        } else {
            drawioUi = 'kennedy';
            drawioDark = 0;
        }

        this.iframe = container.createEl("iframe", {
            attr: {
                src: `http://localhost:${this.plugin.settings.port}/?embed=1&proto=json&libraries=1&spin=1&ui=${drawioUi}&dark=${drawioDark}&splash=0&instance=${this.instanceId}`,
                name: this.instanceId
            },
        });
        this.iframe?.addClass('drawioIframe');

        const extractVaultPath = (s: string | null): string | null => {
            if (!s) return null;
            s = s.trim();

            const wiki = s.match(/^\s*!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
            if (wiki) return wiki[1];

            const obs = s.match(/obsidian:\/\/open\?(?:[^#]*&)?file=([^&\s]+)/);
            if (obs) return decodeURIComponent(obs[1]);

            if (s.startsWith('file://')) {
                try {
                    const url = new URL(s);
                    let p = decodeURIComponent(url.pathname);
                    if (p.startsWith('/')) p = p.slice(1);
                    return p;
                } catch (e) {}
            }

            const firstLine = s.split('\n')[0];
            if (firstLine.includes('/') || firstLine.includes('.')) return firstLine;

            return null;
        };

        const onDragOver = (event: DragEvent) => {
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        };

        const onDrop = async (event: DragEvent) => {
            event.preventDefault();
            const dt = event.dataTransfer;
            if (!dt) return;
            console.log

            try { console.debug('text/plain:', dt.getData && dt.getData('text/plain')); } catch(e) {}
            if (dt.files && dt.files.length > 0) {
                for (let i = 0; i < dt.files.length; i++) {
                    const file = dt.files[i];
                    const text = await file.text();
                    const folder = this.plugin.settings.Folder;
                    const candidatePath = folder ? `${folder}/${file.name}` : file.name;
                
                    try {
                        const existing = this.app.vault.getAbstractFileByPath(candidatePath);
                        if (!existing) {
                            this.currentFile = await this.app.vault.create(candidatePath, text);
                            new Notice(`✅ ${t('CreatedNewDiagram')} ${this.currentFile.path}`);
                        } else if (existing instanceof TFile) {
                            this.currentFile = existing;
                            await this.app.vault.modify(this.currentFile, text);
                            new Notice(`💾 ${t('saveDiagram')} ${this.currentFile.path}`);
                        }

                    } catch (e) {
                        console.error(e);
                        new Notice(`❌ ${t('FailedCreateNewDiagram')} ${file.name}`);
                    }

                    this.sendMessageToDrawio({ action: 'load', xml: text, autosave: 1 });
                }
                return;
            }

            if (dt.items && dt.items.length > 0) {
                for (let i = 0; i < dt.items.length; i++) {
                    const item = dt.items[i];
                    if (item.kind === 'file') {
                        const f = item.getAsFile();
                        if (f) {
                            const text = await f.text();
                            this.sendMessageToDrawio({ action: 'load', xml: text, autosave: 1 });
                            return;
                        }
                    } else {
                        await new Promise<void>((resolve) => {
                            item.getAsString(async (s) => {
                                const path = extractVaultPath(s);
                                if (path) {
                                    let af = this.app.vault.getAbstractFileByPath(path);
                                    if (!af && path.startsWith('/')) af = this.app.vault.getAbstractFileByPath(path.replace(/^\/+/, ''));
                                    if (af instanceof TFile) {
                                        this.currentFile = af;
                                        this.setFileName(this.currentFile.basename.replace(/\.[^/.]+$/, ""));
                                        const xml = await this.app.vault.read(af);
                                        this.sendMessageToDrawio({ action: 'load', xml, autosave: 1 });
                                    } else {
                                        new Notice(`${t('FileNotFoundIntoVault')} ${path}`);
                                        console.warn('drop: path not found in vault:', path, 'raw:', s);
                                    }
                                } else {
                                    const maybeUrl = (s || '').split('\n').find(Boolean);
                                    if (maybeUrl && (maybeUrl.startsWith('http://') || maybeUrl.startsWith('https://'))) {
                                        try {
                                            const res = await fetch(maybeUrl);
                                            if (res.ok) {
                                                const xml = await res.text();
                                                this.sendMessageToDrawio({ action: 'load', xml, autosave: 1 });
                                            }
                                        } catch (e) {
                                            console.error('fetch failed for drop URL', maybeUrl, e);
                                        }
                                    } else {
                                        new Notice(`${t('FailedRecognizeTranslateData')}`);
                                        console.debug('drop raw string:', s);
                                    }
                                }
                                resolve();
                            });
                        });
                        return;
                    }
                }
            }
        };

        container.addEventListener('dragover', onDragOver);
        container.addEventListener('drop', onDrop);
        this.register(() => container.removeEventListener('dragover', onDragOver));
        this.register(() => container.removeEventListener('drop', onDrop));

        window.addEventListener("message", this.messageHandler);
        this.register(() => window.removeEventListener("message", this.messageHandler));
    }

    async onClose() {
        window.removeEventListener('message', this.messageHandler);
        this.iframe = null;
        this.currentFile = null;
    }

    public setCurrentFile(file: TFile) {
        this.currentFile = file;
    }

    public setFileName(fileName: string) {
        this.fileName = fileName;

        (this.leaf as any).updateHeader?.();
    }

    public sendMessageToDrawio(message: object) {
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(JSON.stringify(message), `http://localhost:${this.plugin.settings.port}`);
        }
    }

    private decodeSvgDataUri(svgDataUri: string): string {
        if (svgDataUri.startsWith("data:image/svg+xml;base64,")) {
            const base64Part = svgDataUri.split(',')[1];
            return Buffer.from(base64Part, 'base64').toString('utf-8');
        } else if (svgDataUri.startsWith("data:image/svg+xml,")) {
            return decodeURIComponent(svgDataUri.split(',')[1]);
        } else {
            throw new Error(`${t('ErrorValidSvgData')}`);
        }
    }

    async listendrawiomessage(event: MessageEvent) {
    const expectedOrigin = `http://localhost:${this.plugin.settings.port}`;
    if (event.origin !== expectedOrigin) return;

    try {
        if (this.iframe && event.source !== this.iframe.contentWindow) {
            return;
        }
    } catch (e) {
        console.debug("Warning: couldn't compare event.source to iframe.contentWindow", e);
    }

    let msg: any;
    try {
        msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch (e) {
        console.warn('Invalid JSON from draw.io:', event.data);
        return;
    }

    if (msg.instance && msg.instance !== this.instanceId) return;

    switch (msg.event) {
        case 'init': {
            const xml = this.currentFile
                ? await this.app.vault.read(this.currentFile)
                : "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>";
            this.sendMessageToDrawio({ action: 'load', xml, autosave: 1 });
            break;
        }

        case 'save': {
            if (this.awaitingExport) {
                return;
            }
            this.awaitingExport = true;

            this.sendMessageToDrawio({ action: 'export', format: 'xmlsvg', xml: 1 });

            setTimeout(() => {
                this.awaitingExport = false;
            }, 5000);
            break;
        }

        case 'export': {
            this.awaitingExport = false;

            let svgContent: string;
            try {
                svgContent = this.decodeSvgDataUri(msg.data);
            } catch (e: any) {
                new Notice(`❌ ${t('FailedDecodeSvg')} ${e?.message ?? e}`);
                return;
            }

            try {
                if (!this.currentFile) {
                    const folderPath = this.plugin.settings.Folder;
                    if(this.fileName) {
                        const fileName = `${this.fileName}.drawio.svg`;
                        const fullPath = folderPath ? `${folderPath}/${fileName}` : this.fileName;
                        this.currentFile = await this.app.vault.create(fullPath as string, svgContent);
                        return new Notice(`✅ ${t('CreatedNewDiagram')} ${this.currentFile.path}`);
                    }
                    const now = new Date();
                    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
                    const fileName = `drawio_${timestamp}.drawio.svg`;
                    const fullPath = `${folderPath}/${fileName}`;
                    this.currentFile = await this.app.vault.create(fullPath as string, svgContent);
                    new Notice(`✅ ${t('CreatedNewDiagram')} ${this.currentFile.path}`);
                    this.setFileName(this.currentFile.basename.replace('.drawio', ""));
                } else {
                    await this.app.vault.modify(this.currentFile, svgContent);

                    await forceMarkdownViewUpdate(this.app, this.currentFile);
                    this.setFileName(this.currentFile.basename.replace(/\.[^/.]+$/, ""))
                    new Notice(`💾 ${t('saveDiagram')} ${this.currentFile.path}`);
                }
            } catch (e) {
                new Notice(`❌ ${t('FailedToSaveDiagram')} ${this.currentFile?.path ?? ''}`);
                console.error(e);
            }
            break;
        }

        case 'exit': {
            break;
        }
    }
    }   
}