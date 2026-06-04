import { App, Component, MarkdownRenderer } from "obsidian";

export class MarkdownTooltip {
    private static instance: MarkdownTooltip;
    private tooltipEl: HTMLElement | null = null;
    private hideTimeout: number | null = null;

    private app: App | null = null;
    private currentSourcePath: string = "";

    private constructor() { }

    static getInstance() {
        if (!this.instance) {
            this.instance = new MarkdownTooltip();
        }
        return this.instance;
    }

    public async show(app: App, markdown: string, event: MouseEvent, sourcePath: string, component: Component) {
        this.app = app;
        this.currentSourcePath = sourcePath;
        this.clearHideTimeout();

        if (!this.tooltipEl) {
            this.tooltipEl = document.createElement("div");
            this.tooltipEl.addClass("drawioMarkdownTooltip", "drawio-markdown-popover", "hover-popover", "markdown-rendered");

            this.tooltipEl.addEventListener("mouseenter", () => this.clearHideTimeout());
            this.tooltipEl.addEventListener("mouseleave", () => this.startHideTimeout());

            this.tooltipEl.addEventListener("click", (e: MouseEvent) => {
                if (!this.app) return;

                const target = e.target as HTMLElement;

                const internalLink = target.closest(".internal-link") as HTMLAnchorElement | null;
                if (internalLink) {
                    e.preventDefault();
                    const href = internalLink.getAttribute("data-href") || internalLink.getAttribute("href");

                    if (href) {
                        const newLeaf = e.metaKey || e.ctrlKey;
                        this.app.workspace.openLinkText(href, this.currentSourcePath, newLeaf);
                        this.hideImmediate();
                    }
                    return;
                }

                const externalLink = target.closest(".external-link") as HTMLAnchorElement | null;
                if (externalLink) {
                    e.preventDefault();
                    const href = externalLink.getAttribute("href");
                    if (href) {
                        window.open(href, "_blank");
                        this.hideImmediate();
                    }
                    return;
                }
            });

            document.body.appendChild(this.tooltipEl);
        } else {
            this.tooltipEl.empty();
        }

        this.updatePosition(event);

        await MarkdownRenderer.render(app, markdown, this.tooltipEl, sourcePath, component);
    }

    public updatePosition(event: MouseEvent) {
        if (!this.tooltipEl) return;

        const offsetX = 10;
        const offsetY = 10;

        let x = event.clientX + offsetX;
        let y = event.clientY + offsetY;

        const rect = this.tooltipEl.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            x = window.innerWidth - rect.width - offsetX;
        }
        if (y + rect.height > window.innerHeight) {
            y = event.clientY - rect.height - offsetY;
        }

        this.tooltipEl.style.left = `${x}px`;
        this.tooltipEl.style.top = `${y}px`;
    }

    public hide() {
        this.startHideTimeout();
    }

    public hideImmediate() {
        this.clearHideTimeout();
        if (this.tooltipEl) {
            this.tooltipEl.remove();
            this.tooltipEl = null;
        }
    }

    private startHideTimeout() {
        this.clearHideTimeout();
        this.hideTimeout = window.setTimeout(() => {
            this.hideImmediate();
        }, 300);
    }

    private clearHideTimeout() {
        if (this.hideTimeout) {
            window.clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }
}