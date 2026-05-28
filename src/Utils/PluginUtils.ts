import DrawioPlugin from "main";
import { App, Editor, MarkdownView, normalizePath, TFile, WorkspaceLeaf } from "obsidian";
import { savingNameFileFormatOption } from "Settings/settings";

export class pluginUtils {
    private plugin: DrawioPlugin

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin;
    }

    getServerUrl(option: "baseurl" | "fullUrl"): string {
        const baseUrl = `http://localhost:${this.plugin.settings.port}`

        const embedmode = `${baseUrl}/?embed=1&proto=json&libraries=1&spin=1&ui=white`

        switch (option) {
            case "baseurl": return baseUrl
            case "fullUrl": return embedmode

            default: return baseUrl
        }
    }

    async getFileNameForSave(): Promise<string> {
        const option: savingNameFileFormatOption = this.plugin.settings.savingNameFileFormat

        switch (option) {
            case "date": {
                const folder = this.plugin.settings.folder;
                const date = new Date();
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                const ms = String(date.getMilliseconds()).padStart(3, '0');

                const fulldate = `${year}${month}${day}${hours}${minutes}${seconds}${ms}`;
                const extension = '.drawio.svg'

                const fullpath = normalizePath(`${folder}/${fulldate}${extension}`)

                if (!await this.plugin.app.vault.adapter.exists(folder)) {
                    this.plugin.app.vault.createFolder(folder)
                    return fullpath;
                }


                return fullpath;
            }

            default: return ""
        }
    }

    findDiagramFileUnderCursor(app: App, editor: Editor, view: MarkdownView) {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);

        const linkRegex = /!\[\[([^|\]]+\.(?:drawio(?:\.svg)?))[^\]]*\]\]|!\[[^\]]*\]\(([^)\s]+?\.(?:drawio(?:\.svg)?))\)/g;

        let match: RegExpExecArray | null;

        while ((match = linkRegex.exec(line)) !== null) {
            const fullMatchText = match[0];

            let linkText = match[1] || match[2];
            if (!linkText) continue;

            linkText = linkText.trim().replace(/^<|>$/g, "");
            linkText = linkText.replace(/^\.?\//, "");
            try { linkText = decodeURIComponent(linkText); } catch (e) { console.log(e) }

            const startIndex = match.index;
            const endIndex = startIndex + fullMatchText.length;

            if (cursor.ch >= startIndex && cursor.ch <= endIndex) {
                const linkedFile = app.metadataCache.getFirstLinkpathDest(linkText, view.file?.path ?? "");
                if (linkedFile instanceof TFile) return linkedFile;

                const byPath = app.vault.getAbstractFileByPath(linkText);
                if (byPath instanceof TFile) return byPath;

                if (linkText.endsWith(".drawio")) {
                    const alt = linkText + ".svg";
                    const altFile = app.vault.getAbstractFileByPath(alt);
                    if (altFile instanceof TFile) return altFile;
                } else if (linkText.endsWith(".drawio.svg")) {
                    const alt = linkText.replace(/\.svg$/, "");
                    const altFile = app.vault.getAbstractFileByPath(alt);
                    if (altFile instanceof TFile) return altFile;
                }

                return null;
            }
        }

        return null;
    }

    refreshLeaves() {
        this.plugin.app.workspace.getLeavesOfType('markdown').forEach(async (leaf) => {
            const state = leaf.getViewState();

            const ephemeralState = leaf.getEphemeralState();

            await leaf.setViewState({ type: 'empty' });
            await leaf.setViewState(state);

            setTimeout(() => {
                leaf.setEphemeralState(ephemeralState);
            }, 0);
        });
    }
}