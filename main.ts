import { Editor, MarkdownView, Menu, Notice, Plugin, TFile, WorkspaceLeaf, MarkdownRenderer } from 'obsidian';

import { DRAWIOVIEW } from 'consts';
import { Drawioview } from 'views/drawioView';
import { setLocale, t } from 'locales/i18n';
import { Server } from 'node:http';
import { launchDrawioServerLogic } from 'utils/ServerStart';
import { DrawioSettings, DEFAULT_SETTINGS } from 'settings/Settings';
import { DrawioTab } from 'settings/Settings-tab';
import { CenteringDiagrams } from 'postProcessing/centeringDiagrams';
import { PercentSize } from 'postProcessing/PercentSize';
import { InteractiveDiagrams } from 'postProcessing/interactiveDiagrams';
import { findDiagramFileUnderCursor } from 'handlers/findDiagramFileUnderCursor';
import { DrawioEmbedModal } from 'views/modalDrawio';
import { DrawioClientManager } from 'utils/drawioClientManager';
import { SetFileNameModal } from 'views/SetFileNameModal';
import { drawioHoverResizeProcessor } from 'postProcessing/ResizeEmbedDiagramsInLink';

import { DrawioDecoder } from "handlers/drawioDataDecoder";
import { ExternalTooltip } from "handlers/externalTooltip";
import { DRAWIO_RESOLVER_VIEW, DrawioResolverView } from 'views/DrawioResolverView';

export default class DrawioPlugin extends Plugin {

    isServerOpen: Server | null = null;
    settings: DrawioSettings;
    private drawioclientwebappManager: DrawioClientManager;
    private cleanupResizeListener: (DrawioPlugin: DrawioPlugin) => void;
    private canvasObserver: MutationObserver | null = null;

    private decoder: DrawioDecoder;
    private externalTooltip: ExternalTooltip;

    async onload() {
        this.drawioclientwebappManager = new DrawioClientManager(this.app, this.manifest);
        await this.drawioclientwebappManager.checkAndUnzipDrawioClient();

        await this.loadSettings();
        
        this.decoder = new DrawioDecoder();
        this.externalTooltip = new ExternalTooltip();

        this.addSettingTab(new DrawioTab(this.app, this));

        this.registerView(
            DRAWIOVIEW,
            (leaf) => new Drawioview(leaf, this)
        )

    this.registerView(
        DRAWIO_RESOLVER_VIEW,
        (leaf) => new DrawioResolverView(leaf, this)
    );

    this.registerExtensions(['drawio'], DRAWIO_RESOLVER_VIEW);

        const userLang = (window.localStorage.getItem('language') || 'en').split('-')[0];
        setLocale(userLang);

        this.registerMarkdownPostProcessor((el, ctx) => {
            this.inlineSvgInDOM(el, ctx.sourcePath);
        });

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf) => {
                this.setupCanvasObserver(leaf);
            })
        );

        this.app.workspace.onLayoutReady(() => {
            this.setupCanvasObserver(this.app.workspace.getMostRecentLeaf());
        });


        this.addRibbonIcon('shapes', t("ribonIconTitle"), async () => {
            this.activateView()
            await launchDrawioServerLogic(this)
        })

        await CenteringDiagrams(this)
        await PercentSize(this)
        
        await InteractiveDiagrams(this, this.app) 
        
        this.registerMarkdownPostProcessor(
            drawioHoverResizeProcessor(this)
        );

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
                const fileToEdit = findDiagramFileUnderCursor(this.app, editor, view);
                const openDrawioModal = async (file?: TFile) => {
                    await launchDrawioServerLogic(this);
                    new DrawioEmbedModal(this.app, this, file, editor).open();
                };
                if (!fileToEdit) {
                    menu.addItem((item) => {
                        item
                            .setTitle(t('CreateNewDiagramContextMenu'))
                            .setIcon("shapes")
                            .setSection("drawio-actions")
                            .onClick(() => openDrawioModal());
                    });
                }
            })
        )

        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if (!(file instanceof TFile)) return;

                if (!file.name.endsWith(".drawio.svg")) return;

                menu.addItem((item) => {
                    item
                        .setTitle(t('editDiagramContextMenu'))
                        .setIcon("pencil")
                        .onClick(async () => {
                            await launchDrawioServerLogic(this);

                            this.activateView(file);
                        });
                });
            })
        );

        this.addCommand({
            id: 'drawio-create-or-edit',
            name: t('CreateAndEditNewDiagram'),
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const fileToEdit = findDiagramFileUnderCursor(this.app, editor, view);
                await launchDrawioServerLogic(this);

                if (fileToEdit) {
                    new DrawioEmbedModal(this.app, this, fileToEdit, editor).open();
                } else {
                    new DrawioEmbedModal(this.app, this, null, editor).open();
                }
            }
        });

        this.addCommand({
            id: 'drawio-SetFileName',
            name: t('SetFileNameForDiagram'),
            callback: () => {
                const leaf = this.app.workspace.getActiveViewOfType(Drawioview);

                if (!leaf) {
                    return;
                }

                if (!leaf.currentFile) {
                    new SetFileNameModal(this.app, this.settings.Folder, (fileName) => {
                        leaf.setFileName(fileName);
                    }).open()
                    return;
                }
            }
        });

        this.addCommand({
            id: 'open-drawio-editor',
            name: t('ribonIconTitle'),
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const fileToEdit = findDiagramFileUnderCursor(this.app, editor, view);
                await launchDrawioServerLogic(this)

                if (fileToEdit) {
                    this.activateView(fileToEdit);
                } else {
                    this.activateView();
                }

            }
        });
    }

    private setupCanvasObserver(leaf: WorkspaceLeaf | null) {
        if (this.canvasObserver) {
            this.canvasObserver.disconnect();
            this.canvasObserver = null;
        }

        if (leaf?.view.getViewType() === 'canvas') {
            const contentEl = leaf.view.contentEl;
            const sourcePath = (leaf.view as any).file?.path || "";

            this.inlineSvgInDOM(contentEl, sourcePath);

            this.canvasObserver = new MutationObserver((mutations) => {
                const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
                if (hasNewNodes) {
                    this.inlineSvgInDOM(contentEl, sourcePath);
                }
            });

            this.canvasObserver.observe(contentEl, {
                childList: true,
                subtree: true
            });
        }
    }

    private async inlineSvgInDOM(el: HTMLElement, sourcePath: string = "") {
        const images = el.querySelectorAll('img[src*=".drawio.svg"]');
        if (images.length === 0) return;

        for (const img of Array.from(images)) {
            if (img.getAttribute('data-svg-processed') === 'true') continue;

            const src = img.getAttribute('src');
            if (!src) continue;

            try {
                img.setAttribute('data-svg-processed', 'true');

                let cleanPath = decodeURIComponent(src.split('?')[0].replace(/app:\/\/[\w\d.-]+\/|local:\/\//, ''));
                if (cleanPath.startsWith('/') && cleanPath[2] === ':') cleanPath = cleanPath.slice(1);

                let svgContent: string | null = null;
                const file = this.app.metadataCache.getFirstLinkpathDest(cleanPath, sourcePath) ||
                    this.app.vault.getAbstractFileByPath(cleanPath);

                if (file instanceof TFile) {
                    svgContent = await this.app.vault.read(file);
                } else {
                    const vaultRoot = (this.app.vault.adapter as any).basePath.replace(/\\/g, '/');
                    const relativePath = cleanPath.replace(vaultRoot, "").replace(/^\//, "");
                    if (await this.app.vault.adapter.exists(relativePath)) {
                        svgContent = await this.app.vault.adapter.read(relativePath);
                    }
                }

                if (svgContent) {
                    const svgStart = svgContent.indexOf('<svg');
                    if (svgStart !== -1) {
                        const container = document.createElement('div');
                        container.innerHTML = svgContent.substring(svgStart);
                        const svgElement = container.querySelector('svg');

                        if (svgElement) {
                            if (img.className) svgElement.classList.add(...img.classList.values());
                            svgElement.setAttribute('style', img.getAttribute('style') || '');
                            svgElement.style.width = "100%";
                            svgElement.style.height = "100%";
                            
                            svgElement.setAttribute('data-svg-processed', 'true');
                            svgElement.addClass("drawio-diagram-svg");

                            if (document.body.classList.contains("theme-light")) {
                                svgElement.classList.add("drawio-scheme-light");
                            } else {
                                svgElement.classList.add("drawio-scheme-dark");
                            }

                            img.replaceWith(svgElement);
                            
                            if (this.settings.interactiveDiagram) {
                                const model = this.decoder.extractDiagramData(svgElement);
                                
                                if (model) {
                                    const cellElements = svgElement.querySelectorAll<SVGGElement>('g[data-cell-id]');

                                    for (const cellElement of Array.from(cellElements)) {
                                        const cellId = cellElement.getAttribute("data-cell-id");
                                        if (!cellId) continue;

                                        const objectNode = model.querySelector(`object[id="${cellId}"]`);
                                        if (!objectNode) continue;

                                        const markdownParts: string[] = [];
                                        for (const attr of Array.from(objectNode.attributes)) {
                                            if (attr.name.startsWith("md-") && attr.value.trim()) {
                                                markdownParts.push(attr.value.trim());
                                            }
                                        }

                                        if (markdownParts.length > 0) {
                                            cellElement.addClass('interactiveElement');
                                            
                                            const tooltipDiv = createDiv({ attr: { "data-tooltip-id": cellId } });
                                            tooltipDiv.classList.add(
                                                "drawio-markdown-tooltip",
                                                "drawio-markdown-tooltip--hidden"
                                            );

                                            el.appendChild(tooltipDiv);

                                            await MarkdownRenderer.render(
                                                this.app,
                                                markdownParts.join("\n\n"),
                                                tooltipDiv,
                                                sourcePath,
                                                this
                                            ).catch((err) => console.error("Markdown render error:", err));

                                            let hideTimeout: number | null = null;

                                            const showTooltip = (event: MouseEvent) => {
                                                if (hideTimeout) {
                                                    clearTimeout(hideTimeout);
                                                    hideTimeout = null;
                                                }
                                                tooltipDiv.classList.remove("drawio-markdown-tooltip--hidden");
                                                tooltipDiv.classList.add("drawio-markdown-tooltip--show");
                                                
                                                tooltipDiv.style.position = 'fixed';
                                                tooltipDiv.style.left = `${event.clientX + 15}px`;
                                                tooltipDiv.style.top = `${event.clientY + 15}px`;
                                                tooltipDiv.style.zIndex = '2000';
                                            };

                                            const hideTooltip = () => {
                                                hideTimeout = window.setTimeout(() => {
                                                    tooltipDiv.classList.remove("drawio-markdown-tooltip--show");
                                                    tooltipDiv.classList.add("drawio-markdown-tooltip--hidden");
                                                }, 200);
                                            };

                                            cellElement.addEventListener("mouseenter", showTooltip);
                                            cellElement.addEventListener("mouseleave", hideTooltip);
                                            tooltipDiv.addEventListener("mouseenter", () => {
                                                if (hideTimeout) clearTimeout(hideTimeout);
                                            });
                                            tooltipDiv.addEventListener("mouseleave", hideTooltip);
                                        }
                                    }
                                }

                                const links = svgElement.querySelectorAll<SVGAElement>("a");

                                for (const link of Array.from(links)) {
                                    const hrefLink = link.getAttribute("xlink:href") ?? link.getAttribute("href") ?? "";
                                    let cleanHref = hrefLink;
                                    
                                    const externalMatch = hrefLink.match(/^https?:\/\//);
                                    
                                    if (externalMatch) {
                                        cleanHref = externalMatch.input ?? hrefLink;
                                        link.classList.add("external-link");

                                        const moveHandler = this.externalTooltip.updatePosition.bind(this.externalTooltip);

                                        link.addEventListener("mouseenter", (event) => {
                                            this.externalTooltip.show(cleanHref, event as MouseEvent);
                                            document.addEventListener("mousemove", moveHandler);
                                        });

                                        link.addEventListener("mouseleave", () => {
                                            this.externalTooltip.hide();
                                            document.removeEventListener("mousemove", moveHandler);
                                        });
                                        
                                        link.setAttribute("href", cleanHref);
                                        link.setAttribute("target", "_blank");
                                    } else {
                                        let linkText = "";
                                        const matchDoubleSquare = hrefLink.match(/\[\[(.*?)\]\]/);
                                        const matchRound = hrefLink.match(/\[.*?\]\((.*?)\)/);

                                        if (matchDoubleSquare) {
                                            linkText = matchDoubleSquare[1];
                                        } else if (matchRound) {
                                            linkText = matchRound[1];
                                        } else if (hrefLink && !hrefLink.startsWith("data:")) {
                                            linkText = hrefLink;
                                        }

                                        if (linkText) {
                                            link.classList.add("internal-link");
                                            const parts = linkText.split('|');
                                            const targetFile = parts[0]; 

                                            link.setAttribute("href", targetFile);
                                            
                                            link.addEventListener("click", (e) => {
                                                e.preventDefault();
                                                this.app.workspace.openLinkText(targetFile, sourcePath, e.ctrlKey || e.metaKey);
                                            });

                                            link.addEventListener("mouseenter", (e) => {
                                                this.app.workspace.trigger('hover-link', {
                                                    event: e,
                                                    source: 'drawio-preview',
                                                    hoverParent: el,
                                                    targetEl: link,
                                                    linktext: targetFile,
                                                    sourcePath: sourcePath
                                                });
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Drawio Inline Error:", err);
            }
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async onunload() {
        if (this.canvasObserver) {
            this.canvasObserver.disconnect();
        }

        

        if (this.isServerOpen) {
            this.isServerOpen.close(() => {
                new Notice(t("StopDrawioClinetServer"));
                this.isServerOpen = null;
            });
        }

        const ExternalLinkTooltip = document.querySelectorAll('.drawio-external-tooltip');
        if (ExternalLinkTooltip) {
            ExternalLinkTooltip.forEach(Tooltip => {
                Tooltip.remove();
            });
        }

        const Markdowntooltips = document.querySelectorAll('.drawio-markdown-tooltip');
        if (Markdowntooltips) {
            Markdowntooltips.forEach(markdowntooltip => {
                markdowntooltip.remove();
            });
        }
        
        if (this.cleanupResizeListener) {
            this.cleanupResizeListener(this);
        }
    }

    async activateView(file?: TFile) {
        const leaf = this.app.workspace.getLeaf(true);
        if (!leaf) return;
        await leaf.setViewState({
            type: DRAWIOVIEW,
            active: true,
        });

        this.app.workspace.revealLeaf(leaf);
        const drawioView = leaf.view;
        if (drawioView instanceof Drawioview && file) {
            drawioView.setCurrentFile(file);
            drawioView.setFileName(file.basename.replace(/\.[^/.]+$/, ""))
            const fileData = await this.app.vault.read(file);

            drawioView.sendMessageToDrawio({
                action: 'load',
                xml: fileData,
                autosave: 1,
            });
        }
    }
}