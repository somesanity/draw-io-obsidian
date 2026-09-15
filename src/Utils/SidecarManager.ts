import { SIDECAR_EXPORT_RETRY_DELAY, SIDECAR_LOAD_FALLBACK_DELAY, SIDECAR_RENDER_TIMEOUT } from "consts";
import { t } from "locales/I18n";
import DrawioPlugin from "main";
import { TFile } from "obsidian";
import { pluginUtils } from "./PluginUtils";
import { decodeSvgDataUri, getSidecarPath } from "./SidecarPaths";

type CachedSidecar = {
    mtime: number;
    svg: string;
}

/**
 * Keeps a `.drawio.svg` preview next to every `.drawio` source file: reads it from the vault when it
 * is up to date and otherwise re-exports it through an off-screen draw.io client.
 */
export class SidecarManager {
    private plugin: DrawioPlugin;
    private utils: pluginUtils;

    private svgCache: Map<string, CachedSidecar> = new Map();
    private pendingRenders: Map<string, Promise<string | null>> = new Map();
    private internalWrites: Set<string> = new Set();
    private renderChain: Promise<void> = Promise.resolve();

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin;
        this.utils = new pluginUtils(plugin);
    }

    destroy() {
        this.svgCache.clear();
        this.pendingRenders.clear();
        this.internalWrites.clear();

        document.querySelectorAll("iframe.drawio-sidecar-renderer").forEach(iframe => iframe.remove());
    }

    getSidecarFile(xmlFile: TFile): TFile | null {
        const found = this.plugin.app.vault.getAbstractFileByPath(getSidecarPath(xmlFile.path));
        return found instanceof TFile ? found : null;
    }

    hasFreshSidecar(xmlFile: TFile): boolean {
        const cached = this.svgCache.get(xmlFile.path);
        if (cached && cached.mtime >= xmlFile.stat.mtime) return true;

        const sidecar = this.getSidecarFile(xmlFile);
        return !!sidecar && sidecar.stat.mtime >= xmlFile.stat.mtime;
    }

    invalidate(xmlPath: string) {
        this.svgCache.delete(xmlPath);
    }

    /** Marks a save started by the plugin itself, so the vault `modify` handler can ignore it. */
    markInternalWrite(xmlPath: string) {
        this.internalWrites.add(xmlPath);
    }

    isInternalWrite(xmlPath: string): boolean {
        return this.internalWrites.has(xmlPath);
    }

    async getSvg(xmlFile: TFile): Promise<string | null> {
        const cached = this.svgCache.get(xmlFile.path);
        if (cached && cached.mtime >= xmlFile.stat.mtime) return cached.svg;

        const sidecar = this.getSidecarFile(xmlFile);

        if (sidecar && sidecar.stat.mtime >= xmlFile.stat.mtime) {
            const svg = await this.plugin.app.vault.read(sidecar);
            this.svgCache.set(xmlFile.path, { mtime: sidecar.stat.mtime, svg });
            return svg;
        }

        return this.rebuildSidecar(xmlFile);
    }

    rebuildSidecar(xmlFile: TFile): Promise<string | null> {
        const inFlight = this.pendingRenders.get(xmlFile.path);
        if (inFlight) return inFlight;

        const task = (async () => {
            try {
                const xml = await this.plugin.app.vault.read(xmlFile);
                const svg = await this.renderXmlToSvg(xml);
                if (!svg) return null;

                await this.writeSidecar(xmlFile, svg);
                return svg;
            } catch (error) {
                console.error(t("SIDECAR__RENDER_FAILED"), error);
                return null;
            } finally {
                this.pendingRenders.delete(xmlFile.path);
            }
        })();

        this.pendingRenders.set(xmlFile.path, task);
        return task;
    }

    async writeSidecar(xmlFile: TFile, svg: string): Promise<void> {
        const sidecarPath = getSidecarPath(xmlFile.path);
        const existing = this.plugin.app.vault.getAbstractFileByPath(sidecarPath);

        if (existing instanceof TFile) {
            await this.plugin.app.vault.modify(existing, svg);
        } else {
            await this.plugin.app.vault.create(sidecarPath, svg);
        }

        const stored = this.plugin.app.vault.getAbstractFileByPath(sidecarPath);

        this.svgCache.set(xmlFile.path, {
            mtime: stored instanceof TFile ? stored.stat.mtime : Date.now(),
            svg
        });

        window.setTimeout(() => this.internalWrites.delete(xmlFile.path), 1000);
    }

    /** Serializes exports so several stale diagrams never spawn draw.io clients in parallel. */
    private renderXmlToSvg(xml: string): Promise<string | null> {
        const task = this.renderChain.then(() => this.runHeadlessExport(xml));

        this.renderChain = task.then(() => undefined, () => undefined);

        return task;
    }

    private async waitForServer(origin: string): Promise<void> {
        for (let attempt = 0; attempt < 15; attempt++) {
            try {
                const response = await fetch(`${origin}/index.html`, { cache: "no-store" });
                if (response.ok) return;
            } catch (error) {
                // the local client is still starting up
            }

            await new Promise<void>(resolve => window.setTimeout(resolve, 200));
        }

        throw new Error(t("SIDECAR__SERVER_UNAVAILABLE"));
    }

    private async runHeadlessExport(xml: string): Promise<string | null> {
        if (!this.plugin.server) {
            this.plugin.serverManager.startServer();
        }

        const origin = this.utils.getServerUrl("baseurl");
        await this.waitForServer(origin);

        return new Promise<string | null>((resolve, reject) => {
            const iframe = document.body.createEl("iframe", {
                cls: "drawio-sidecar-renderer",
                attr: { src: this.utils.getServerUrl("fullUrl") }
            });

            let settled = false;
            const retryTimers: number[] = [];

            const finish = (svg: string | null, error?: Error) => {
                if (settled) return;
                settled = true;

                window.clearTimeout(timer);
                retryTimers.forEach(retry => window.clearTimeout(retry));
                window.removeEventListener("message", listener);
                iframe.remove();

                error ? reject(error) : resolve(svg);
            };

            const requestExport = () => {
                if (settled) return;

                iframe.contentWindow?.postMessage(JSON.stringify({ action: "export", format: "xmlsvg" }), origin);
                retryTimers.push(window.setTimeout(requestExport, SIDECAR_EXPORT_RETRY_DELAY));
            };

            const listener = (event: MessageEvent) => {
                if (event.origin !== origin || event.source !== iframe.contentWindow) return;

                let message: any = null;
                try {
                    message = JSON.parse(event.data);
                } catch (error) {
                    return;
                }

                if (message.event === "init") {
                    iframe.contentWindow?.postMessage(JSON.stringify({ action: "load", xml }), origin);
                    // older clients stay silent about the load, so ask for the export anyway
                    retryTimers.push(window.setTimeout(requestExport, SIDECAR_LOAD_FALLBACK_DELAY));
                    return;
                }

                if (message.event === "load") {
                    requestExport();
                    return;
                }

                if (message.event === "export") {
                    finish(decodeSvgDataUri(message.data));
                }
            };

            const timer = window.setTimeout(() => finish(null, new Error(t("SIDECAR__TIMEOUT"))), SIDECAR_RENDER_TIMEOUT);

            window.addEventListener("message", listener);
        });
    }
}
