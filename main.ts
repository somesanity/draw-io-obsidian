import { Plugin, WorkspaceLeaf, ItemView, Notice, App, TFile } from "obsidian";
import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { Buffer } from 'buffer';

const DRAWIO_VIEW = "drawio-webview";

export default class DrawIOPlugin extends Plugin {
	private serveProcess: ChildProcessWithoutNullStreams | null = null;

	async onload() {
		this.registerView(DRAWIO_VIEW, (leaf) => new DrawIOView(leaf, this));

		this.addRibbonIcon("shapes", "Open Draw.io", async () => {
			await this.launchDrawioServer();

			const leaf = this.app.workspace.getLeaf(true);
			await leaf.setViewState({
				type: DRAWIO_VIEW,
				active: true,
			});
		});

		new Notice("✅ Draw.io plugin loaded");
	}

	onunload() {
		if (this.serveProcess) {
			this.serveProcess.kill("SIGTERM");
			this.serveProcess = null;
			new Notice("🛑 Draw.io server stopped");
		}

		this.app.workspace.detachLeavesOfType(DRAWIO_VIEW);
	}

	private async launchDrawioServer() {
		if (this.serveProcess) return;

		const vaultBasePath = (this.app.vault.adapter as any).basePath as string;
		const pluginDir = path.join(vaultBasePath, this.manifest.dir!);
		const webAppPath = path.join(pluginDir, "webapp");

		if (!fs.existsSync(webAppPath)) {
			new Notice("📂 'webapp' folder not found");
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
				src: "http://localhost:8080/?embed=1&proto=json&libraries=1&spin=1&ui=dark&dark=1&splash=0",
				style: "width: 100%; height: 100%; border: none;",
			},
		});

		const messageHandler = async (event: MessageEvent) => {
			const origin = event.origin;
			if (origin !== "http://localhost:8080") return;

			let msg;
			try {
				msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
			} catch (e) {
				console.error("Ошибка парсинга сообщения от Draw.io:", e);
				return;
			}

			await handleDrawioMessage(msg, event.source as Window, this.app);
		};

		window.addEventListener("message", messageHandler);

		this.register(() => {
			window.removeEventListener("message", messageHandler);
		});
	}

	async onClose() {

	}
}

async function saveDrawioSvgToVault(app: App, fileName: string, svgContent: string) {
    const folderPath = "Drawio"; 
    const fullPath = `${folderPath}/${fileName}.svg`;

    let contentToSave: string;


    if (svgContent.startsWith("data:image/svg+xml;base64,")) {
        try {
            const base64Part = svgContent.split(',')[1];

            contentToSave = Buffer.from(base64Part, 'base64').toString('utf-8');
            
            console.log("SVG content decoded successfully.");
        } catch (e) {
            new Notice("❌ Failed to decode SVG content.");
            console.error("Ошибка декодирования SVG:", e);
            contentToSave = svgContent;
        }
    } else {
        contentToSave = svgContent;
    }

    try {
        const folder = app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
            await app.vault.createFolder(folderPath);
        }
    } catch (err) {
        console.error("Ошибка создания папки:", err);
    }

    const existingFile = app.vault.getAbstractFileByPath(fullPath);
    if (existingFile instanceof TFile) {
        await app.vault.modify(existingFile, contentToSave);
    } else {
        await app.vault.create(fullPath, contentToSave);
    }

    new Notice("💾 Diagram saved as editable SVG: " + fullPath);
}

async function handleDrawioMessage(msg: any, sourceWindow: Window, app: App) {
	console.log("📩 Message from Draw.io:", msg);

	switch (msg.event) {
		case "init":
			sourceWindow.postMessage(
				JSON.stringify({
					action: "load",
					xml: "<mxGraphModel><root></root></mxGraphModel>",
					autosave: 1,
				}),
				"http://localhost:8080"
			);
			break;

		case "save":
			sourceWindow.postMessage(
				JSON.stringify({
					action: "export",
					format: "xmlsvg", 
					xml: true,
				}),
				"http://localhost:8080"
			);
			break;

		case "export":
			console.log("🖼 Exported data received", msg.data);
			await saveDrawioSvgToVault(app, "diagram.drawio", msg.data);
			break;

		case "change":
			console.log("🌀 Diagram changed");
			break;

		case "exit":
			console.log("👋 User exited Draw.io");
			break;

		case "ready":
			console.log("✅ Draw.io is ready");
			break;

		case "error":
			console.error("❌ Error from Draw.io:", msg.message);
			break;

		case "load":
		case "configure":
			break;
	}
}
