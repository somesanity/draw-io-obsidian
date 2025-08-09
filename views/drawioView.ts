import { ItemView, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { DRAWIOVIEW } from 'consts';
import { t } from 'locales/i18n';
import DrawioPlugin from 'main';

export class Drawioview extends ItemView {
	public iframe: HTMLIFrameElement | null = null;
	private messageHandler: (event: MessageEvent) => void;
	public plugin: DrawioPlugin;
	public currentFile: TFile | null = null;

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
	
	getIcon() {
		return 'shapes';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
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
				src: `http://localhost:${this.plugin.settings.port}/?embed=1&proto=json&libraries=1&spin=1&ui=${drawioUi}&dark=${drawioDark}&splash=0`,
			},
		});

		this.iframe.addClass('drawioIframe');

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

	public sendMessageToDrawio(message: object) {
		if (this.iframe && this.iframe.contentWindow) {
			this.iframe.contentWindow.postMessage(JSON.stringify(message), `http://localhost:${this.plugin.settings.port}`);
		}
	}

	async listendrawiomessage(event: MessageEvent) {
		if (event.origin !== `http://localhost:${this.plugin.settings.port}`) return;

		let msg;
		try {
			msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
		} catch (e) {
			console.warn('Invalid JSON from draw.io:', event.data);
			return;
		}

		switch (msg.event) {
			case 'init': {
				const xml = this.currentFile
					? await this.app.vault.read(this.currentFile)
					: "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>";
				this.sendMessageToDrawio({ action: 'load', xml, autosave: 1 });
				break;
			}
			case 'save': {
				this.sendMessageToDrawio({ action: 'export', format: 'xmlsvg', xml: 1 });
				break;
			}
			case 'export': {
				const svgBase64 = msg.data;
				const svgContent = atob(svgBase64.replace(/^data:image\/svg\+xml;base64,/, ''));

				if (!this.currentFile) {
					const now = new Date();
					const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
					const fileName = `drawio_${timestamp}.drawio.svg`;
					const folderPath = this.plugin.settings.Folder;
					const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

					try {
						this.currentFile = await this.app.vault.create(fullPath, svgContent);
						new Notice(`✅ ${t('CreateNewDiagram')} ${this.currentFile.path}`);
					} catch (e) {
						new Notice(`❌ ${t('FailedCreateNewDiagram')} ${fileName}`);
						console.error(e);
					}
				} else {
					try {
						await this.app.vault.modify(this.currentFile, svgContent);
						new Notice(`💾 ${t('saveDiagram')} ${this.currentFile.path}`);
					} catch (e) {
						new Notice(`❌ ${t('FailedToSaveDiagram')} ${this.currentFile.path}`);
						console.error(e);
					}
				}
				break;
			}
			case 'exit':
				break;
		}
	}
}