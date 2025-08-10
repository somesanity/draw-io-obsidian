import { Editor, MarkdownView, TFile, App } from "obsidian";

export function findDiagramFileUnderCursor(app: App, editor: Editor, view: MarkdownView): TFile | null {
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
