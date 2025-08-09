import { App, TFile, MarkdownView } from 'obsidian';

export async function forceMarkdownViewUpdate(app: App, file: TFile | null) {
    if (!file) {
        return; 
    }
    const diagramFile: TFile = file; 

    const leaves = app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
        const mdView = leaf.view as MarkdownView;
        if (!mdView || !mdView.file) {
            continue;
        }
        const currentViewFile: TFile = mdView.file; 

        try {
            let needsRebuild = false;
            if (!currentViewFile || !currentViewFile.path) {
                continue; 
            }

            if (currentViewFile.path === diagramFile.path) {
                needsRebuild = true;
            } else {
                const fileContent = await app.vault.cachedRead(currentViewFile);
                if (fileContent.includes(diagramFile.name) || fileContent.includes(encodeURI(diagramFile.name))) {
                    needsRebuild = true;
                }
            }

            if (needsRebuild) {
                if (typeof (leaf as any).rebuildView === 'function') {
                    await (leaf as any).rebuildView();
                } else {
                    const viewState = leaf.getViewState();
                    await leaf.setViewState({ type: 'empty' });
                    await leaf.setViewState(viewState);
                }
            }
            
        } catch (err) {
            console.log(err)
        }
    }
}