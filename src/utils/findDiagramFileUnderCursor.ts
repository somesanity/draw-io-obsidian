// Resources/utils/diagram-utils.ts
import { Editor, MarkdownView, TFile, App } from "obsidian"; // Импортируем App, чтобы передавать его как аргумент

export function findDiagramFileUnderCursor(app: App, editor: Editor, view: MarkdownView): TFile | null {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    // Регулярное выражение лучше вынести в константу, если оно используется многократно
    const linkRegex = /!\[\[([^|\]]+\.(?:drawio\.svg|drawio))[^\]]*\]\]/g;
    let execMatch;

    while ((execMatch = linkRegex.exec(line)) !== null) {
        const fullMatchText = execMatch[0];
        const linkText = execMatch[1];
        const startIndex = execMatch.index;
        const endIndex = startIndex + fullMatchText.length;

        if (cursor.ch >= startIndex && cursor.ch <= endIndex) {
            // Используем переданный 'app' вместо 'this.app'
            const linkedFile = app.metadataCache.getFirstLinkpathDest(linkText, view.file?.path ?? "");
            if (linkedFile instanceof TFile) {
                return linkedFile;
            }
        }
    }
    return null;
}