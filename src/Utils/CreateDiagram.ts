import { deflateRaw } from "pako";
import { DRAWIO_EDITOR_VIEW } from "consts";
import { t } from "locales/I18n";
import type DrawioPlugin from "main";
import { Notice, TFolder } from "obsidian";
import { pluginUtils } from "./PluginUtils";

function emptyDiagramSvg(): string {
    const xml = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
    const compressed = deflateRaw(encodeURIComponent(xml));
    const diagram = btoa(String.fromCharCode(...compressed));
    const content = `<mxfile><diagram id="page-1" name="Page-1">${diagram}</diagram></mxfile>`;
    const escapedContent = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1" content="${escapedContent}"></svg>`;
}

export async function createDiagram(plugin: DrawioPlugin, folder: TFolder): Promise<void> {
    try {
        const path = await new pluginUtils(plugin).getFileNameForSave(folder.path);
        if (!path) return;

        const extension = ".drawio.svg";
        const base = path.slice(0, -extension.length);
        let uniquePath = path;
        let suffix = 1;
        while (await plugin.app.vault.adapter.exists(uniquePath)) {
            uniquePath = `${base} ${suffix++}${extension}`;
        }

        const file = await plugin.app.vault.create(uniquePath, emptyDiagramSvg());
        await plugin.activateView(DRAWIO_EDITOR_VIEW, { file });
    } catch (error) {
        console.error("Failed to create draw.io diagram", error);
        new Notice(t("DRAWIO_NOTICE__CREATE_FAILED"));
    }
}

export function registerCreateDiagramMenu(plugin: DrawioPlugin): void {
    plugin.registerEvent(plugin.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFolder)) return;

        menu.addItem(item => item
            .setTitle(t("DRAWIO_MENU__NEW_DIAGRAM"))
            .setIcon("shapes")
            .onClick(() => createDiagram(plugin, file)));
    }));
}
