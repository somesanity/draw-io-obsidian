import { TextFileView, TFile, WorkspaceLeaf } from 'obsidian';
import { DRAWIOVIEW } from 'consts';
import { launchDrawioServerLogic } from 'utils/ServerStart';
import DrawioPlugin from 'main';

export const DRAWIO_RESOLVER_VIEW = "drawio-resolver-view";

export class DrawioResolverView extends TextFileView {
    public plugin: DrawioPlugin;
    constructor(leaf: WorkspaceLeaf, plugin: DrawioPlugin) {
        super(leaf);
        this.plugin = plugin;
    }
    
    async onLoadFile(file: TFile): Promise<void> {
        const workspace = this.app.workspace;
        let existingLeaf: WorkspaceLeaf | null = null;

        workspace.iterateAllLeaves((leaf) => {
            const view = leaf.view;
            if (view.getViewType() === DRAWIOVIEW && (view as any).currentFile?.path === file.path) {
                existingLeaf = leaf;
            }
        });

        if (existingLeaf) {
            workspace.setActiveLeaf(existingLeaf, { focus: true });
            this.leaf.detach();
        } else {
            const leaf = this.leaf;
            setTimeout(async () => {
                await launchDrawioServerLogic(this.plugin);
                await leaf.setViewState({
                    type: DRAWIOVIEW,
                    active: true,
                    state: { file: file.path }
                });
            }, 0);
        }
    }

    getViewData(): string { return ""; }
    setViewData(data: string, clear: boolean): void {}
    clear(): void {}
    getViewType(): string { return DRAWIO_RESOLVER_VIEW; }
    
    getIcon() { return 'shapes'; }
}