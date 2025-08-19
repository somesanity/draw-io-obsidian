import { App, TFolder, normalizePath } from "obsidian";

export function folderExists(app: App, path: string): boolean {
  const normalized = normalizePath(path);
  const folder = app.vault.getAbstractFileByPath(normalized);

  return folder instanceof TFolder;
}
