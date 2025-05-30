import { Plugin, WorkspaceLeaf, ItemView, Notice } from "obsidian";
import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

const DRAWIO_VIEW = "drawio-webview";

export default class DrawIOPlugin extends Plugin {
    private serveProcess: ChildProcessWithoutNullStreams | null = null;

    async onload() {
        this.registerView(DRAWIO_VIEW, (leaf) => new DrawIOView(leaf, this));

        this.addRibbonIcon("shapes", "open Draw.io", async () => {
            await this.launchDrawioServer();

            const leaf = this.app.workspace.getLeaf(true);
            await leaf.setViewState({
                type: DRAWIO_VIEW,
                active: true,
            });
        });

        new Notice("✅ Draw.io is loaded!");
    }

    onunload() {
        if (this.serveProcess) {
            this.serveProcess.kill("SIGTERM");
            this.serveProcess = null;
            new Notice("🛑 Server Draw.io is stopped.");
        }

        this.app.workspace.detachLeavesOfType(DRAWIO_VIEW);
    }

    private async launchDrawioServer() {
        if (this.serveProcess) return;

        const vaultBasePath = (this.app.vault.adapter as any).basePath as string;
        const pluginDir = path.join(vaultBasePath, this.manifest.dir!);
        const webAppPath = path.join(pluginDir, "webapp");

        if (!fs.existsSync(webAppPath)) {
            new Notice("📂 folder 'webapp' not found.");
            return;
        }

        this.serveProcess = spawn("npx", ["serve", webAppPath, "-l", "8080"], {
            cwd: pluginDir,
            shell: true,
            detached: false,
        });

        await new Promise((res) => setTimeout(res, 1000));
    }
}

class DrawIOView extends ItemView {
    private plugin: DrawIOPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: DrawIOPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return DRAWIO_VIEW;
    }

    getDisplayText(): string {
        return "Draw.io";
    }
    
    getIcon(): string {
        return "shapes";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        
        container.empty();
        const iframe = container.createEl("iframe", {
            attr: {
                src: "http://localhost:8080",
                style: "width: 100%; height: 100%; border: none;",
            },
        });

}

    async onClose() {
    }
}