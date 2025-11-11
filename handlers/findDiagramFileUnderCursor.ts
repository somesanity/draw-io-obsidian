import { Editor, MarkdownView, TFile, App } from "obsidian";
import { DRAWIO_FILE_PATTERN } from "consts";

export function findDiagramFileUnderCursor(app: App, editor: Editor, view: MarkdownView): TFile | null {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);

    const linkRegex = new RegExp(`!\\[\\[([^|\\]]+\\.(?:drawio(?:\\.svg)?|drawid))[^\\]]*\\]\\]|!\\[[^\\]]*\\]\\(([^)\\s]+?\\.(?:drawio(?:\\.svg)?|drawid))\\)`, 'g');
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

            // Try alternative extensions
            if (linkText.endsWith(".drawio")) {
                const alt = linkText + ".svg";
                const altFile = app.vault.getAbstractFileByPath(alt);
                if (altFile instanceof TFile) return altFile;
            } else if (linkText.endsWith(".drawio.svg")) {
                const alt = linkText.replace(/\.svg$/, "");
                const altFile = app.vault.getAbstractFileByPath(alt);
                if (altFile instanceof TFile) return altFile;
            } else if (linkText.endsWith(".drawid")) {
                // Try .drawio.svg and .drawio alternatives
                const alt1 = linkText.replace(/\.drawid$/, ".drawio.svg");
                const altFile1 = app.vault.getAbstractFileByPath(alt1);
                if (altFile1 instanceof TFile) return altFile1;
                
                const alt2 = linkText.replace(/\.drawid$/, ".drawio");
                const altFile2 = app.vault.getAbstractFileByPath(alt2);
                if (altFile2 instanceof TFile) return altFile2;
            }

            return null;
        }
    }

    return null;
}
