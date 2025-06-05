import { Editor, MarkdownView, TFile, App } from "obsidian";

export function findDiagramFileUnderCursor(app: App, editor: Editor, view: MarkdownView): TFile | null {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);

    const linkRegex = /!\[\[([^|\]]+\.(?:drawio\.svg|drawio))[^\]]*\]\]/g;
    let execMatch;

    while ((execMatch = linkRegex.exec(line)) !== null) {
        const fullMatchText = execMatch[0];
        const linkText = execMatch[1];
        const startIndex = execMatch.index;
        const endIndex = startIndex + fullMatchText.length;

        if (cursor.ch >= startIndex && cursor.ch <= endIndex) {
            const linkedFile = app.metadataCache.getFirstLinkpathDest(linkText, view.file?.path ?? "");
            if (linkedFile instanceof TFile) {
                return linkedFile;
            }
        }
    }
    return null;
}