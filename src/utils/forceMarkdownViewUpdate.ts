import { App, TFile, MarkdownView } from 'obsidian';

export async function forceMarkdownViewUpdate(app: App, file: TFile | null) {
    if (!file) {
        console.warn("forceMarkdownViewUpdate: Вызвана с null файлом. Невозможно определить, изменения какого файла отслеживать.");
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
                console.warn(`forceMarkdownViewUpdate: currentViewFile или его путь стал null/undefined для листа ${leaf}. Пропускаем перестройку.`);
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
                console.log(`Markdown view for ${currentViewFile.path} обновлено из-за изменений в ${diagramFile.path}.`);
            }
        } catch (err) {
            const currentViewFilePathForLog = currentViewFile?.path ?? 'unknown file (no path)';
            const diagramFilePathForLog = diagramFile?.path ?? 'unknown diagram path'; 

            console.warn(`Не удалось обновить представление для ${currentViewFilePathForLog} относительно изменений в ${diagramFilePathForLog}:`, err);
        }
    }
}