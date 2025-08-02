import { TFile, Vault, App } from 'obsidian';

export function getFileContent(element: Element, app: App): TFile | null {
    const src = element.getAttribute("src"); // drawio_*.svg
    if (!src) return null;

    const file = app.vault.getAbstractFileByPath(src);
    return file instanceof TFile ? file : null;
}
