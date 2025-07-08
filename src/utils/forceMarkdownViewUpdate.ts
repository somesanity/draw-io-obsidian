import { App, TFile, MarkdownView } from 'obsidian';

export async function forceMarkdownViewUpdate(app: App, file: TFile | null) {
    if (!file) {
    console.warn("forceMarkdownViewUpdate: Called with a null file. Unable to determine which file's changes to track.");
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
                console.warn(`forceMarkdownViewUpdate: currentViewFile or its path became null/undefined for leaf ${leaf}. Skipping rebuild.`);
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
            const currentViewFilePathForLog = currentViewFile?.path ?? 'unknown file (no path)';
            const diagramFilePathForLog = diagramFile?.path ?? 'unknown diagram path'; 

            console.warn(`Failed to update the view for ${currentViewFilePathForLog} in response to changes in ${diagramFilePathForLog}:`, err);
        }
    }
}