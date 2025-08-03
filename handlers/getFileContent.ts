import DrawioPlugin from 'main';
import { TFile, Vault, App } from 'obsidian';
import { findFileByName } from 'utils/findFileByName';

export function getFileContent(element: Element, app: App): TFile | null {

    const src = element.getAttribute("src");
    if (!src) return null;

    const filename = src.split('/').pop();
    
    if (!filename) return null;

    const file = findFileByName(filename, app);

    return file instanceof TFile ? file : null;
}