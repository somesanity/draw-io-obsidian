import DrawioPlugin from "main";
import { EXTERNAL_LINK_CHECK, INTERNAL_LINK_CHECK, CLEAR_INTERNAL_LINK, DRAWIO_EDITOR_VIEW, MARKDOWN_FRAGMENT_SEARCH } from "../consts";
import { ExternalLinkTooltip } from "./ExternalLinkTooltip";
import { pluginUtils } from "./PluginUtils";
import { Menu, TFile } from "obsidian";
import { MarkdownTooltip } from "./markdownTooltip";
import { MxGraphParser } from "./MxGraphParser";
import { t } from "locales/I18n";

export class CanvasManager {
    plugin: DrawioPlugin;
    private observer: MutationObserver | null = null;
    utils: pluginUtils;

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin;
        this.utils = new pluginUtils(this.plugin)
    }

    init() {
        this.plugin.app.workspace.onLayoutReady(() => {
            this.startObserving();
            this.registerCanvasContextMenu();

        });
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        ExternalLinkTooltip.getInstance().destroy();
    }

    private startObserving() {
        const targetNode = document.body;

        const config = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"]
        };

        this.observer = new MutationObserver((mutationsList) => {
            if (!this.isCanvasViewActive()) return;

            this.observer?.disconnect();

            for (const mutation of mutationsList) {
                if (mutation.type === "childList") {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof HTMLElement) {
                            this.replaceImageToSvg(node);
                        }
                    });
                }

                if (mutation.type === "attributes" && this.plugin.settings?.AlwaysFocusedInCanvas) {
                    const target = mutation.target as HTMLElement;

                    if (target.classList && target.classList.contains("canvas-node") && !target.classList.contains("is-focused")) {
                        const hasDrawioSvg = target.querySelector(".drawio-diagram-Canvas");
                        if (hasDrawioSvg) {
                            target.classList.add("is-focused");
                        }
                    }
                }
            }

            this.observer?.observe(targetNode, config);
        });

        this.observer.observe(targetNode, config);

        if (this.isCanvasViewActive()) {
            this.replaceImageToSvg(document.body);
        }
    }

    private isCanvasViewActive(): boolean {
        const leaves = this.plugin.app.workspace.getLeavesOfType("canvas");
        return leaves.length > 0;
    }

    private async replaceImageToSvg(element: HTMLElement) {
        const canvasImages = element.querySelectorAll(".canvas-node-content.image-embed img");

        const targets = element.matches(".canvas-node-content.image-embed img")
            ? [element, ...Array.from(canvasImages)]
            : Array.from(canvasImages);

        targets.forEach(async (node) => {
            const img = node as HTMLImageElement;
            const src = img.getAttribute("src") || "";

            if (src.includes(".drawio.svg")) {
                try {
                    const vaultPath = this.getVaultPathFromSrc(src);
                    if (!vaultPath) return;

                    const svgContent = await this.plugin.app.vault.adapter.read(vaultPath);

                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
                    const svgElement = svgDoc.querySelector("svg");

                    if (svgElement) {
                        svgElement.setAttribute("class", img.className);
                        svgElement.style.width = "100%";
                        svgElement.style.height = "100%";

                        this.processSvgLinks(svgElement);

                        this.attachTooltipListeners(svgElement);
                        this.attachMarkdownTooltipListeners(svgElement);

                        const canvasNode = img.closest(".canvas-node") as HTMLElement;

                        img.replaceWith(svgElement);

                        if (canvasNode) {
                            this.applyCanvasStyles(canvasNode, svgElement);
                        }
                    }
                } catch (error) {
                    console.error(t("CANVAS__REPLACEIMAGETOSVG_ERROR"), error);
                }
            }
        });
    }

    private applyCanvasStyles(canvasNode: HTMLElement, svgElement: SVGSVGElement) {
        const settings = this.plugin.settings;
        if (!settings) return;

        const container = canvasNode.querySelector(".canvas-node-container");
        const label = canvasNode.querySelector(".canvas-node-label");

        svgElement.classList.add("drawio-diagram-Canvas");

        const themeClass = this.utils.setDiagramsTheme("canvasMode");
        if (themeClass) {
            svgElement.classList.add(themeClass);
        }

        if (container) {
            container.classList.toggle(
                "canvas-node-container-drawio--hiddenBorder",
                !!settings.HiddenBorderInCanvas
            );
        }

        if (container) {
            container.classList.toggle(
                "canvas-node-container-drawio--backgroundTransparent",
                !!settings.TransparentDiagramBackgroundInCanavas
            );
        }

        if (label) {
            label.classList.toggle(
                "canvas-node-label-drawio--hidden",
                !!settings.HiddenLabelInCanvas
            );
        }

        canvasNode.classList.toggle(
            "canvas-node-drawio--focusedBorderHidden",
            !!settings.HiddenBorderInFocusMode
        );

        if (settings.AlwaysFocusedInCanvas) {
            canvasNode.classList.add("is-focused");
        }
    }

    private processSvgLinks(svgElement: SVGSVGElement) {
        const anchors = svgElement.querySelectorAll("a");
        const activeFile = this.plugin.app.workspace.getActiveFile();
        const sourcePath = activeFile ? activeFile.path : "";

        anchors.forEach((anchor) => {
            const href = anchor.getAttribute("href") || anchor.getAttribute("xlink:href") || "";

            if (INTERNAL_LINK_CHECK.test(href)) {
                const cleanPath = decodeURIComponent(href.trim().replace(CLEAR_INTERNAL_LINK, "").trim());

                anchor.setAttribute("data-href", cleanPath);
                anchor.setAttribute("href", cleanPath);
                anchor.setAttribute("xlink:href", cleanPath);
                anchor.classList.add("internal-link");

                anchor.addEventListener("mouseover", (event: MouseEvent) => {
                    this.plugin.app.workspace.trigger("hover-link", {
                        event,
                        source: "canvas-drawio-plugin",
                        hoverParent: svgElement,
                        targetEl: anchor,
                        linktext: cleanPath,
                        sourcePath: sourcePath
                    });
                });

                anchor.addEventListener("click", (event: MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();

                    const isNewLeaf = event.ctrlKey || event.metaKey;
                    this.plugin.app.workspace.openLinkText(cleanPath, sourcePath, isNewLeaf);
                });
            }
        });
    }

    private attachTooltipListeners(svgElement: SVGSVGElement) {
        const tooltip = ExternalLinkTooltip.getInstance();

        svgElement.addEventListener("mouseover", (event: MouseEvent) => {
            const target = event.target as SVGElement;
            const anchor = target.closest("a");

            if (anchor) {
                const href = anchor.getAttribute("href") || anchor.getAttribute("xlink:href") || "";
                if (EXTERNAL_LINK_CHECK.test(href)) {
                    tooltip.show(href, event);
                } else {
                    tooltip.hide(0);
                }
            }
        });

        svgElement.addEventListener("mousemove", (event: MouseEvent) => {
            const target = event.target as SVGElement;
            const anchor = target.closest("a");

            if (anchor) {
                const href = anchor.getAttribute("href") || anchor.getAttribute("xlink:href") || "";
                if (EXTERNAL_LINK_CHECK.test(href)) {
                    tooltip.updatePosition(event);
                }
            }
        });

        svgElement.addEventListener("mouseout", (event: MouseEvent) => {
            const target = event.target as SVGElement;
            const anchor = target.closest("a");

            if (anchor) {
                const relatedTarget = event.relatedTarget as HTMLElement;
                if (!relatedTarget || !anchor.contains(relatedTarget)) {
                    tooltip.hide();
                }
            }
        });
    }

    private attachMarkdownTooltipListeners(svgElement: SVGSVGElement) {
        const parser = new MxGraphParser();
        const parsedmx = parser.parse(svgElement);

        if (!parsedmx) return;

        const objects = parsedmx.querySelectorAll("object");
        const markdownTooltip = MarkdownTooltip.getInstance();

        const activeFile = this.plugin.app.workspace.getActiveFile();
        const sourcePath = activeFile ? activeFile.path : "";

        objects.forEach((object) => {
            const objectId = object.getAttribute("id");
            if (!objectId) return;

            const markdownAttr = Array.from(object.attributes).find((attr) =>
                MARKDOWN_FRAGMENT_SEARCH.test(attr.name)
            );

            if (markdownAttr) {
                const markdownContent = markdownAttr.value;
                const cell = svgElement.querySelector(`[data-cell-id="${objectId}"]`);

                if (cell) {
                    cell.addEventListener("mouseenter", (event: MouseEvent) => {
                        markdownTooltip.show(this.plugin.app, markdownContent, event, sourcePath, this.plugin);
                    });

                    cell.addEventListener("mouseleave", () => {
                        markdownTooltip.hide();
                    });
                }
            }
        });
    }

    private getVaultPathFromSrc(src: string): string | null {
        try {
            const decodedSrc = decodeURIComponent(src);
            const cleanSrc = decodedSrc.split("?")[0];
            const vaultBasePath = (this.plugin.app.vault.adapter as any).getBasePath();

            const normalizedSrc = cleanSrc!.replace(/\\/g, "/");
            const normalizedVaultPath = vaultBasePath.replace(/\\/g, "/");

            const vaultIndex = normalizedSrc.indexOf(normalizedVaultPath);
            if (vaultIndex !== -1) {
                return normalizedSrc.substring(vaultIndex + normalizedVaultPath.length + 1);
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    private registerCanvasContextMenu() {
        this.plugin.registerEvent(
            // @ts-ignore
            this.plugin.app.workspace.on("canvas:node-menu", (menu: Menu, node: any) => {
                if (node.file instanceof TFile && node.file.extension === "svg" && node.file.name.endsWith(".drawio.svg")) {

                    menu.addItem((item) => {
                        item.setTitle("Открыть в редакторе Draw.io")
                            .setIcon("shapes")
                            .onClick(async () => {
                                this.plugin.activateView(DRAWIO_EDITOR_VIEW, { file: node.file as TFile })
                            });
                    });
                }
            })
        );

        this.plugin.registerEvent(
            // @ts-ignore
            this.plugin.app.workspace.on("canvas:node-menu", (menu: Menu, node: any) => {
                if (node.file instanceof TFile && node.file.extension === "svg" && node.file.name.endsWith(".drawio.svg")) {

                    menu.addItem((item) => {
                        item.setTitle("Копировать диаграмму как изображение")
                            .setIcon("copy")
                            .onClick(async () => {
                                this.plugin.app.workspace.trigger('drawio:copy-diagram-as-image', node.file);
                            });
                    });
                }
            })
        );
    }
}