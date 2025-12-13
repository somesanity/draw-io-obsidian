import DrawioPlugin from 'main';
import { TextFileView, WorkspaceLeaf, TFile } from 'obsidian';
import { launchDrawioServerLogic } from 'utils/ServerStart';

export const DRAWIO_EXTENSION_RENDER_VIEW = 'drawio-render-view';

export class DrawioExtensionRenderView extends TextFileView {
    
    public plugin: DrawioPlugin;
  
    constructor(leaf: WorkspaceLeaf, plugin: DrawioPlugin) {
        super(leaf);
        this.plugin = plugin;
    }
    
    getViewType(): string {
        return DRAWIO_EXTENSION_RENDER_VIEW;
    }

    getDisplayText(): string {
        return this.file ? this.file.name.replace('.drawio', '') : 'Drawio View';
    }

    getIcon() {
        return 'shapes';
    }
    
    getViewData(): string {
        return this.data; 
    }

    setViewData(data: string, clear: boolean): void {
        this.data = data;
        
        if (data.startsWith("<mxfile")) {
        this.redirectToEditView();
        return;
    }

        const fileContent = this.data; 
        const fileObject: TFile | null = this.file;

        this.renderView(fileContent, fileObject);
    }

    async renderView(content: string, file: TFile | null) {
        const container = this.contentEl;
        container.empty();
        
        if (file) {
          if(content.startsWith("<mxfile")) {
            await launchDrawioServerLogic(this.plugin);
            return
          }
          container.innerHTML = content;
          container.addClass("centered-diagram--RenderView")
        } else {
             container.createEl('p', { text: 'Файл еще не загружен или не существует.' });
        }
    }

    async redirectToEditView() {
    if (!this.file) return;

    this.leaf.detach();
    
    await launchDrawioServerLogic(this.plugin);
    this.plugin.activateView(this.file);
    }

    async onOpen() {
    }
    
    async onClose() {
    }

    clear(): void {
        this.data = ''; 
        this.contentEl.empty();
    }
}