import { MarkdownView, Notice, TFile, App, Editor } from "obsidian";
import type DrawIOPlugin from '../../main'; 
import { DrawioEmbedModal } from "src/classes/DrawioEmbedModal";

export async function handleDiagramClick(event: MouseEvent, app: App, plugin: DrawIOPlugin) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
    }

    const target = event.target as HTMLElement;
    const embedEl = target.closest('img.internal-embed, svg.internal-embed');

    if (embedEl) {
        const src = embedEl.getAttribute('src');
        if (src) {
            let filePath = src;
            if (filePath.endsWith('.drawio.svg')) {
                event.preventDefault();
                event.stopPropagation();
                const file = app.vault.getAbstractFileByPath(filePath); 

                if (file instanceof TFile) {
                    await plugin.launchDrawioServer(); 
                    const currentMarkdownView = app.workspace.getActiveViewOfType(MarkdownView); 
                    if (currentMarkdownView) {
                        new DrawioEmbedModal(app, currentMarkdownView.editor, plugin, file).open(); 
                    } else {
                        new Notice("Cannot edit diagram: No active Markdown view.");
                    }
                } else {
                    new Notice(`❌ File not found or is not a TFile: ${filePath}`);
                }
            }
        }
    }
}