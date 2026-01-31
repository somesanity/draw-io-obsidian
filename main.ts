import { Editor, MarkdownView, Menu, Notice, Plugin, TFile, WorkspaceLeaf, MarkdownRenderer, Component } from 'obsidian';

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

    private tooltipContainer: HTMLElement | null = null;
    private renderComponent: Component;
    private hoverTimeout: number | null = null;
    private currentTargetSourcePath: string = "";

    async onload() {
        this.drawioclientwebappManager = new DrawioClientManager(this.app, this.manifest);
        await this.drawioclientwebappManager.checkAndUnzipDrawioClient();

        await this.loadSettings();
        
        this.decoder = new DrawioDecoder();
        this.externalTooltip = new ExternalTooltip();
        
        this.renderComponent = new Component();
        this.renderComponent.load();

        this.createSharedTooltip();

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

        // --- ИЗМЕНЕНИЕ: Слушатель для обновления Canvas ---
        this.registerEvent(
            this.app.vault.on("modify", async (file) => {
                if (file instanceof TFile && file.name.endsWith(".drawio.svg")) {
                    // Задержка 200мс, чтобы Obsidian успел записать изменения и обновить кэш чтения
                    setTimeout(async () => {
                        await this.reloadDrawioInCanvas(file);
                    }, 200);
                }
            })
        );
        // -------------------------------------------------

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
                if (!leaf) return;
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

    private createSharedTooltip() {
        if (this.tooltipContainer) return;

        this.tooltipContainer = document.body.createDiv({ 
            cls: "drawio-markdown-tooltip drawio-markdown-tooltip--hidden markdown-rendered" 
        });
        
        this.tooltipContainer.style.position = 'fixed';
        this.tooltipContainer.style.zIndex = 'var(--layer-popover)';
        this.tooltipContainer.style.userSelect = 'text';

        this.tooltipContainer.addEventListener('mouseenter', () => {
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
        });

        this.tooltipContainer.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });

        this.tooltipContainer.addEventListener('click', (evt) => {
            const target = evt.target as HTMLElement;
            const linkEl = target.closest('.internal-link');
            if (linkEl) {
                evt.preventDefault();
                const href = linkEl.getAttribute('href');
                const linkpath = linkEl.getAttribute('data-href') || href;
                if (linkpath) {
                    this.app.workspace.openLinkText(linkpath, this.currentTargetSourcePath, evt.ctrlKey || evt.metaKey);
                }
            }
        });
    }

    private hideTooltip(immediate = false) {
        if (!this.tooltipContainer) return;

        const doHide = () => {
            this.tooltipContainer?.classList.remove("drawio-markdown-tooltip--show");
            this.tooltipContainer?.classList.add("drawio-markdown-tooltip--hidden");
            if (this.tooltipContainer) this.tooltipContainer.empty();
        };

        if (immediate) {
            doHide();
        } else {
            this.hoverTimeout = window.setTimeout(doHide, 300);
        }
    }

    private handleCellMouseEnter = async (event: MouseEvent) => {
        const target = event.currentTarget as SVGGElement;
        const markdown = target.getAttribute('data-drawio-md');
        const sourcePath = target.getAttribute('data-drawio-source-path') || "";
        
        if (!markdown || !this.tooltipContainer) return;

        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }

        this.currentTargetSourcePath = sourcePath;

        this.tooltipContainer.empty();
        
        await MarkdownRenderer.render(this.app, markdown, this.tooltipContainer, sourcePath, this.renderComponent);

        this.tooltipContainer.classList.remove("drawio-markdown-tooltip--hidden");
        this.tooltipContainer.classList.add("drawio-markdown-tooltip--show");
        
        this.positionTooltip(event.clientX, event.clientY);
    }

    private handleCellMouseLeave = () => {
        this.hideTooltip(false);
    }

    private positionTooltip(x: number, y: number) {
        if (!this.tooltipContainer) return;

        const rect = this.tooltipContainer.getBoundingClientRect();
        let top = y + 15;
        let left = x + 15;

        if (top + rect.height > window.innerHeight) top = y - rect.height - 10;
        if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 10;
        
        if (top < 0) top = 10;
        if (left < 0) left = 10;

        this.tooltipContainer.style.top = `${top}px`;
        this.tooltipContainer.style.left = `${left}px`;
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
                let needsCheck = false;
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) needsCheck = true;
                    
                    if (this.settings.AlwaysFocusedInCanvas && mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const target = mutation.target as HTMLElement;
                        if (target.classList.contains('canvas-node-drawio') && !target.classList.contains('is-focused')) {
                            target.classList.add('is-focused');
                        }
                    }
                }
                if (needsCheck) this.inlineSvgInDOM(contentEl, sourcePath);
            });

            this.canvasObserver.observe(contentEl, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }

    // --- ИЗМЕНЕНИЕ: Метод обновления диаграммы в Canvas ---
    private async reloadDrawioInCanvas(file: TFile) {
        const leaves = this.app.workspace.getLeavesOfType("canvas");
        
        for (const leaf of leaves) {
            const container = leaf.view.contentEl;
            // Ищем все наши обработанные SVG
            const svgs = container.querySelectorAll('.drawio-diagram-svg');
            
            for (const svg of Array.from(svgs)) {
                // Проверяем 1: по явному ID файла
                const fileAttr = svg.getAttribute('data-drawio-file');
                // Проверяем 2: по исходному SRC (если ID не успел проставиться или старая версия)
                const originalSrc = svg.getAttribute("data-original-src") || "";
                
                let isMatch = false;
                if (fileAttr === file.path) {
                    isMatch = true;
                } else if (originalSrc) {
                    // Декодируем, чтобы убрать %20 и т.д.
                    const cleanPath = decodeURIComponent(originalSrc.split('?')[0]);
                    if (cleanPath.endsWith(file.name)) {
                        isMatch = true;
                    }
                }

                if (!isMatch) continue;

                const parent = svg.parentElement;
                if (!parent) continue;

                // Создаем временный IMG для замены
                const img = document.createElement("img");
                
                // Добавляем timestamp (?t=...), чтобы браузер перечитал файл, а не брал из кэша
                img.src = (originalSrc || this.app.vault.getResourcePath(file)) + "?t=" + Date.now();
                
                const originalClass = svg.getAttribute("data-original-class");
                if (originalClass) img.className = originalClass;
                
                const originalStyle = svg.getAttribute("data-original-style");
                if (originalStyle) img.setAttribute("style", originalStyle);

                // Убираем маркер обработки
                img.removeAttribute('data-svg-processed');

                // Заменяем SVG на IMG
                svg.replaceWith(img);
                
                // Даем браузеру такт на перерисовку DOM
                await new Promise(resolve => requestAnimationFrame(resolve));

                const canvasSourcePath = (leaf.view as any).file?.path || "";
                // Запускаем инлайн заново
                await this.inlineSvgInDOM(parent as HTMLElement, canvasSourcePath);
            }
        }
    }
    // -----------------------------------------------------

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
                let file = this.app.metadataCache.getFirstLinkpathDest(cleanPath, sourcePath) ||
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
                            // --- ВАЖНО для обновления: Сохраняем путь к файлу ---
                            if (file instanceof TFile) {
                                svgElement.setAttribute('data-drawio-file', file.path);
                            }
                            // ----------------------------------------------------

                            svgElement.setAttribute('data-original-src', src);
                            svgElement.setAttribute('data-original-class', img.className);
                            svgElement.setAttribute('data-original-style', img.getAttribute('style') || '');

                            if (img.className) svgElement.classList.add(...img.classList.values());
                            svgElement.setAttribute('style', img.getAttribute('style') || '');
                            svgElement.style.width = "100%";
                            svgElement.style.height = "100%";
                            svgElement.setAttribute('data-svg-processed', 'true');
                            svgElement.addClass("drawio-diagram-svg");

                            // --- ИЗМЕНЕНИЕ: Включаем выделение текста ---
                            svgElement.style.userSelect = "text";
                            svgElement.style.webkitUserSelect = "text";
                            svgElement.style.pointerEvents = "all";
                            // --------------------------------------------

                            document.body.classList.contains("theme-light") ? svgElement.classList.add("drawio-scheme-light") : svgElement.classList.add("drawio-scheme-dark");

                            const canvasNode = img.closest('.canvas-node') as HTMLElement;
                            if (canvasNode) {
                                canvasNode.classList.add('canvas-node-drawio');
                                const nodeContainer = canvasNode.querySelector('.canvas-node-container') as HTMLElement;
                                if (nodeContainer) {
                                    nodeContainer.classList.add('canvas-node-container-drawio');
                                    if(this.settings.HiddenBorderInCanvas) nodeContainer.classList.add("canvas-node-container-drawio--hiddenBorder");
                                }
                                const nodeLabel = canvasNode.querySelector('.canvas-node-label') as HTMLElement;
                                if (nodeLabel) {
                                    nodeLabel.classList.add("canvas-node-label-drawio");
                                    if(this.settings.HiddenLabelInCanvas) nodeLabel.classList.add("canvas-node-label-drawio--hidden");
                                }

                                if(this.settings.AlwaysFocusedInCanvas) canvasNode.classList.add("is-focused");
                                if(this.settings.HiddenBorderInFocusMode) canvasNode.classList.add("canvas-node-drawio--focusedBorderHidden")
                                if(this.settings.TransparentDiagramBackgroundInCanavas) nodeContainer.classList.add("canvas-node-container-drawio--backgroundTransparent")
                            }

                            img.replaceWith(svgElement);
                            
                            if (this.settings.interactiveDiagram) {
                                const model = this.decoder.extractDiagramData(svgElement);
                                if (model) {
                                    const cellElements = svgElement.querySelectorAll<SVGGElement>('g[data-cell-id]');
                                    for (const cellElement of Array.from(cellElements)) {
                                        const cellId = cellElement.getAttribute("data-cell-id");
                                        const objectNode = cellId ? model.querySelector(`object[id="${cellId}"]`) : null;
                                        if (!objectNode) continue;

                                        const markdownParts: string[] = [];
                                        for (const attr of Array.from(objectNode.attributes)) {
                                            if (attr.name.startsWith("md-") && attr.value.trim()) markdownParts.push(attr.value.trim());
                                        }

                                        if (markdownParts.length > 0) {
                                            cellElement.addClass('interactiveElement');
                                            
                                            cellElement.setAttribute('data-drawio-md', markdownParts.join("\n\n"));
                                            cellElement.setAttribute('data-drawio-source-path', sourcePath);
                                            
                                            cellElement.addEventListener("mouseenter", this.handleCellMouseEnter);
                                            cellElement.addEventListener("mouseleave", this.handleCellMouseLeave);
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

                                        if (matchDoubleSquare) linkText = matchDoubleSquare[1];
                                        else if (matchRound) linkText = matchRound[1];
                                        else if (hrefLink && !hrefLink.startsWith("data:")) linkText = hrefLink;

                                        if (linkText) {
                                            link.classList.add("internal-link");
                                            const targetFile = linkText.split('|')[0]; 
                                            link.setAttribute("href", targetFile);
                                            link.addEventListener("click", (e) => {
                                                e.preventDefault();
                                                this.app.workspace.openLinkText(targetFile, sourcePath, e.ctrlKey || e.metaKey);
                                            });
                                            link.addEventListener("mouseenter", (e) => {
                                                this.app.workspace.trigger('hover-link', {
                                                    event: e, source: 'drawio-preview', hoverParent: el,
                                                    targetEl: link, linktext: targetFile, sourcePath: sourcePath
                                                });
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (err) { console.error("Drawio Inline Error:", err); }
        }
    }

    async saveSettings() { await this.saveData(this.settings); }
    async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }

    async onunload() {
        if (this.canvasObserver) this.canvasObserver.disconnect();
        if (this.isServerOpen) {
            this.isServerOpen.close(() => {
                new Notice(t("StopDrawioClinetServer"));
                this.isServerOpen = null;
            });
        }
        
        if (this.tooltipContainer) {
            this.tooltipContainer.remove();
            this.tooltipContainer = null;
        }
        if (this.renderComponent) {
            this.renderComponent.unload();
        }

        document.querySelectorAll('.drawio-external-tooltip, .drawio-markdown-tooltip').forEach(el => el.remove());
        if (this.cleanupResizeListener) this.cleanupResizeListener(this);
    }

    async activateView(file?: TFile) {
        const leaf = this.app.workspace.getLeaf(true);
        if (!leaf) return;
        await leaf.setViewState({ type: DRAWIOVIEW, active: true });
        this.app.workspace.revealLeaf(leaf);
        if (leaf.view instanceof Drawioview && file) {
            leaf.view.setCurrentFile(file);
            leaf.view.setFileName(file.basename.replace(/\.[^/.]+$/, ""))
            leaf.view.sendMessageToDrawio({ action: 'load', xml: await this.app.vault.read(file), autosave: 1 });
        }
    }
}