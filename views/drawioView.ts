import { FileView, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { DRAWIOVIEW } from 'consts';
import { t } from 'locales/i18n';
import DrawioPlugin from 'main';
import { forceMarkdownViewUpdate } from 'handlers/forceMarkdownViewUpdate';
import { launchDrawioServerLogic } from 'utils/ServerStart';
import { isXmlFormat } from 'handlers/fileExtensionUtils';

export class Drawioview extends FileView {
    public iframe: HTMLIFrameElement | null = null;
    private messageHandler: (event: MessageEvent) => void;
    public plugin: DrawioPlugin;
    public currentFile: TFile | null = null;
    private instanceId: string;
    private awaitingExport: boolean = false;
    private isInitialized: boolean = false;
    private readonly EMPTY_DIAGRAM_XML = "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>";
    constructor(leaf: WorkspaceLeaf, plugin: DrawioPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.messageHandler = this.listendrawiomessage.bind(this);
        this.instanceId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
            ? (crypto as any).randomUUID()
            : `inst_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    }

    getViewType() {
        return DRAWIOVIEW;
    }

    getDisplayText() {
        return this.file?.name ?? t("DrawIoViewName");
    }

    canAcceptExtension(extension: string): boolean {
        return ['drawio', 'drawid'].includes(extension) || extension === 'drawio.svg';
    }
    
    getIcon() {
        return 'shapes';
    }

    async onOpen() {
        await launchDrawioServerLogic(this.plugin);

        const container = this.containerEl.children[1] as any;
        container.empty();

        // Try to reuse cached iframe
        const cachedIframe = this.plugin.getCachedIframe();
        if (cachedIframe && cachedIframe.contentWindow) {
            this.iframe = cachedIframe;
            container.appendChild(this.iframe);
            this.isInitialized = true;
            
            // Load current file if exists
            const fileToLoad = this.file ?? this.currentFile;
            if (fileToLoad) {
                await this.loadDiagramFromFile(fileToLoad);
            }
            return;
        }

        // Create new iframe if no cache available
        this.isInitialized = false;

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
        
        // Cache iframe for reuse instead of destroying it
        if (this.iframe) {
            this.plugin.cacheIframe(this.iframe);
            this.iframe.remove(); // Remove from DOM but keep reference
        }
        
        this.iframe = null;
        this.currentFile = null;
        this.isInitialized = false;
        this.updateTitle();
    }

    async onLoadFile(file: TFile): Promise<void> {
        if (this.currentFile?.path === file.path) return;
        this.currentFile = file;
        this.updateTitle();
        if (this.isInitialized) {
            await this.loadDiagramFromFile(file);
        }
    }

    async onUnloadFile(): Promise<void> {
        this.currentFile = null;
        this.updateTitle();
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
            this.isInitialized = true;

            const fileToLoad = this.file ?? this.currentFile;
            if (fileToLoad) {
                await this.loadDiagramFromFile(fileToLoad);
            } else {
                this.sendMessageToDrawio({ action: 'load', xml: this.EMPTY_DIAGRAM_XML, autosave: 1 });
            }
            break;
        }

        case 'save': {
            if (this.awaitingExport) {
                return;
            }
            this.awaitingExport = true;

            // Determine export format based on file extension
            const isXml = isXmlFormat(this.currentFile);
            
            if (isXml) {
                // For XML formats, request XML export and include raw XML
                this.sendMessageToDrawio({ action: 'export', format: 'xml', xml: 1 });
            } else {
                // For SVG format, use xmlsvg
                this.sendMessageToDrawio({ action: 'export', format: 'xmlsvg', xml: 1 });
            }

            setTimeout(() => {
                this.awaitingExport = false;
            }, 5000);
            break;
        }

        case 'export': {
            this.awaitingExport = false;

            const isXml = isXmlFormat(this.currentFile);

            let contentToSave: string;
            
            if (isXml) {
                const xmlPayload = this.extractXmlPayload(msg);
                if (!xmlPayload) {
                    new Notice(`❌ ${t('FailedDecodeSvg')} ${t('NotSaveEmptyDiagram')}`);
                    return;
                }
                contentToSave = xmlPayload;
            } else {
                // For SVG formats, decode the SVG data URI
                try {
                    contentToSave = this.decodeSvgDataUri(msg.data);
                } catch (e: any) {
                    new Notice(`❌ ${t('FailedDecodeSvg')} ${e?.message ?? e}`);
                    return;
                }
            }

            try {
                const targetFile = this.file ?? this.currentFile;
                if (!targetFile) {
                    const now = new Date();
                    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
                    const fileName = `drawio_${timestamp}.drawio`;
                    const folderPath = this.plugin.settings.Folder;
                    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
                    await this.ensureDiagramFolderExists();
                    this.currentFile = await this.app.vault.create(fullPath, contentToSave);
                    new Notice(`✅ ${t('CreatedNewDiagram')} ${this.currentFile.path}`);
                } else {
                    await this.app.vault.modify(targetFile, contentToSave);
                    await forceMarkdownViewUpdate(this.app, targetFile);
                    new Notice(`💾 ${t('saveDiagram')} ${targetFile.path}`);
                }
            } catch (e) {
                const fileForError = this.file ?? this.currentFile;
                new Notice(`❌ ${t('FailedToSaveDiagram')} ${fileForError?.path ?? ''}`);
                console.error(e);
            }
            break;
        }

        case 'exit': {
            this.leaf.detach();
            break;
        }
    }
    }

    private async loadDiagramFromFile(file: TFile) {
        const fileData = await this.app.vault.read(file);

        this.sendMessageToDrawio({
            action: 'load',
            xml: fileData,
            autosave: 1,
        });
    }

    private async ensureDiagramFolderExists() {
        const folderPath = this.plugin.settings.Folder?.trim();
        if (!folderPath) return;

        const existing = this.app.vault.getAbstractFileByPath(folderPath);
        if (!existing) {
            try {
                await this.app.vault.createFolder(folderPath);
            } catch (error: any) {
                if (!error?.message?.includes('already exists')) {
                    console.error('Failed to create diagram folder', error);
                }
            }
        }
    }

    private updateTitle() {
        const title = this.getDisplayText();
        const leaf: any = this.leaf as any;
        if (leaf?.tabHeaderInnerTitleEl) {
            if (typeof leaf.tabHeaderInnerTitleEl.setText === 'function') {
                leaf.tabHeaderInnerTitleEl.setText(title);
            } else {
                leaf.tabHeaderInnerTitleEl.textContent = title;
            }
        }
        if (leaf?.viewHeaderTitleEl) {
            if (typeof leaf.viewHeaderTitleEl.setText === 'function') {
                leaf.viewHeaderTitleEl.setText(title);
            } else {
                leaf.viewHeaderTitleEl.textContent = title;
            }
        }
    }

    private extractXmlPayload(msg: any): string | null {
        const xmlField = typeof msg.xml === 'string' ? msg.xml.trim() : '';
        if (xmlField) return xmlField;

        const dataField = typeof msg.data === 'string' ? msg.data.trim() : '';
        if (!dataField) return null;

        if (dataField.startsWith('data:image/svg+xml')) {
            try {
                const svg = this.decodeSvgDataUri(dataField);
                return this.extractXmlFromSvg(svg);
            } catch (e) {
                console.error('Failed to decode SVG for XML payload', e);
            }
            return null;
        }

        if (dataField.startsWith('data:')) {
            const commaIndex = dataField.indexOf(',');
            if (commaIndex !== -1) {
                const payload = dataField.slice(commaIndex + 1);
                try {
                    if (dataField.substring(0, commaIndex).includes(';base64')) {
                        return atob(payload);
                    } else {
                        return decodeURIComponent(payload);
                    }
                } catch (e) {
                    console.error('Failed to decode data URL payload', e);
                }
            }
        }

        if (dataField.startsWith('<svg')) {
            return this.extractXmlFromSvg(dataField);
        }

        return dataField.startsWith('<') ? dataField : null;
    }

    private extractXmlFromSvg(svgContent: string): string | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgEl = doc.querySelector('svg');
            const contentAttr = svgEl?.getAttribute('content');
            if (!contentAttr) return null;

            const decoded = contentAttr
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");

            return decoded.trim() ? decoded : null;
        } catch (e) {
            console.error('Failed to extract XML from SVG', e);
            return null;
        }
    }
}