import { App, Notice, MarkdownView, TFile } from "obsidian";
import { Buffer } from 'buffer';

import type { DrawIOView } from "./classes/drawio-view";
import { DEFAULT_SETTINGS } from "./classes/settings/Settings";


export async function saveOrUpdateDrawioFile(app: App, view: DrawIOView, svgDataUri: string) {
    const folderPath = (DEFAULT_SETTINGS as any).diagramsFolder || "Drawio";

    let contentToSave: string;

    if (svgDataUri.startsWith("data:image/svg+xml;base64,")) {
        try {
            const base64Part = svgDataUri.split(',')[1];
            contentToSave = Buffer.from(base64Part, 'base64').toString('utf-8');
        } catch (e) {
            new Notice("❌ Failed to decode SVG content.");
            console.error("SVG decoding error:", e);
            return;
        }
    } else if (svgDataUri.startsWith("data:image/svg+xml,")) {
        try {
            contentToSave = decodeURIComponent(svgDataUri.split(',')[1]);
        } catch (e) {
            new Notice("❌ Failed to decode SVG content (URI component).");
            console.error("SVG decoding error (URI component):", e);
            return;
        }
    } else {
        new Notice("❌ Invalid SVG data format received.");
        console.error("Invalid SVG data format:", svgDataUri.substring(0, 100));
        return;
    }

    const emptyDrawioXmlInSvgContent = `content="&lt;mxGraphModel&gt;&lt;root&gt;&lt;mxCell id=&quot;0&quot;/&gt;&lt;mxCell id=&quot;1&quot; parent=&quot;0&quot;/&gt;&lt;/root&gt;&lt;/mxGraphModel&gt;"`;
    const emptySvgStructureIndicator = `<g/>`;
    const isActuallyEmpty = contentToSave.includes(emptyDrawioXmlInSvgContent) &&
        contentToSave.includes(emptySvgStructureIndicator) &&
        (contentToSave.match(/<g\b[^>]*>/g) || []).length === 1 &&
        !contentToSave.includes('<path') &&
        !contentToSave.includes('<rect') &&
        !contentToSave.includes('<ellipse') &&
        !contentToSave.includes('<image') &&
        !contentToSave.includes('<text');

    if (isActuallyEmpty && !view.currentFile) {
        new Notice("🚫 Diagram is empty, new file will not be saved.");
        return;
    }

    let savedFile: TFile | null = null;

    if (view.currentFile) {
        if (isActuallyEmpty) {
            new Notice(`🚫 Diagram content is empty. ${view.currentFile.path} was not modified with empty content from the main view. Close to delete if intended.`);
            return;
        }
        await app.vault.modify(view.currentFile, contentToSave);
        savedFile = view.currentFile;
        new Notice(`💾 Diagram updated: ${savedFile.path}`);
    } else {
        try {
            const folderExists = app.vault.getAbstractFileByPath(folderPath);
            if (!folderExists) {
                await app.vault.createFolder(folderPath);
            }
        } catch (err) {
            new Notice("❌ Failed to create 'Drawio' folder.");
            return;
        }

        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
        const fileName = `diagram_${timestamp}.drawio.svg`;
        const fullPath = `${folderPath}/${fileName}`;

        try {
            savedFile = await app.vault.create(fullPath, contentToSave);
            view.setCurrentFile(savedFile);
            new Notice(`💾 Diagram saved as: ${fullPath}`);
        } catch (e) {
            new Notice(`❌ Failed to save diagram: ${fullPath}`);
            return;
        }
    }

    if (!savedFile) return;

    const leaves = app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
        const mdView = leaf.view as MarkdownView;
        if (!mdView.file) continue;

        let needsRebuild = mdView.file.path === savedFile.path;

        if (!needsRebuild) {
            try {
                const fileContent = await app.vault.cachedRead(mdView.file);
                if (fileContent.includes(savedFile.name) || fileContent.includes(encodeURI(savedFile.name))) {
                    needsRebuild = true;
                }
            } catch (err) {
                console.log(err)
            }
        };

        if (needsRebuild) {
            try {
                if (typeof (leaf as any).rebuildView === 'function') {
                    await (leaf as any).rebuildView();
                } else {
                    const currentViewState = leaf.getViewState();
                    await leaf.setViewState({ type: 'empty' });
                    await leaf.setViewState(currentViewState);
                }
            } catch (err) {
                console.warn(`Failed to update view for ${mdView.file.path}:`, err);
            }
        }
    }
}