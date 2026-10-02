import { EventRef, TFile } from "obsidian";

// Custom workspace events fired by this plugin (see PluginInit.registerEvents).
declare module "obsidian" {
	interface Workspace {
		on(name: "drawio:edit-diagram", callback: (file: TFile) => void, ctx?: unknown): EventRef;
		on(name: "drawio:copy-diagram-as-image", callback: (file: TFile) => void, ctx?: unknown): EventRef;
	}
}
