import { TFile, Vault, App } from 'obsidian';

export function findFileByName(fileName: string, app: App): TFile | null {
    const files = app.vault.getFiles();
    for (const file of files) {
        if (file.name === fileName) {
            return file;
        }
    }
    return null;
}
