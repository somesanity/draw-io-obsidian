export class ExternalLinkTooltip {
    private static instance: ExternalLinkTooltip | null = null;
    private tooltipElement: HTMLElement | null = null;
    private hideTimeout: NodeJS.Timeout | null = null;

    private constructor() { }

    public static getInstance(): ExternalLinkTooltip {
        if (!ExternalLinkTooltip.instance) {
            ExternalLinkTooltip.instance = new ExternalLinkTooltip();
        }
        return ExternalLinkTooltip.instance;
    }

    private getTooltipElement(targetDocument: Document): HTMLElement {
        let el = targetDocument.getElementById('drawio-external-link-tooltip');

        if (!el) {
            el = targetDocument.createElement('div');
            el.id = 'drawio-external-link-tooltip';
            el.classList.add('drawio-external-link-tooltip');
            el.classList.add('drawio-external-link-tooltip--position');

            el.addEventListener('mouseenter', () => {
                if (this.hideTimeout) {
                    clearTimeout(this.hideTimeout);
                    this.hideTimeout = null;
                }
            });
            el.addEventListener('mouseleave', () => {
                this.hide();
            });

            targetDocument.body.appendChild(el);
        }

        this.tooltipElement = el;
        return el;
    }

    public show(text: string, event: MouseEvent): void {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        const currentDocument = (event.target as HTMLElement).ownerDocument || document;
        const el = this.getTooltipElement(currentDocument);

        el.textContent = text;
        el.classList.add('drawio-external-link-tooltip--show');
        el.classList.remove('drawio-external-link-tooltip--hidden');

        this.updatePosition(event, el);
    }

    public hide(delay = 50) {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        this.hideTimeout = setTimeout(() => {
            if (this.tooltipElement) {
                this.tooltipElement.classList.remove('drawio-external-link-tooltip--show');
                this.tooltipElement.classList.add('drawio-external-link-tooltip--hidden');
            }
        }, delay);
    }

    public updatePosition(event: MouseEvent, element?: HTMLElement) {
        const el = element || this.tooltipElement;
        if (!el) return;

        const currentWindow = el.ownerDocument?.defaultView || window;
        const styles = currentWindow.getComputedStyle(el);

        const offsetX = parseInt(styles.getPropertyValue('--drawio-external-link-tooltip-offset-x'), 10) || 0;
        const offsetY = parseInt(styles.getPropertyValue('--drawio-external-link-tooltip-offset-y'), 10) || 0;

        let newLeft = event.clientX + currentWindow.scrollX + offsetX;
        let newTop = event.clientY + currentWindow.scrollY + offsetY;

        const tooltipWidth = el.offsetWidth;
        const tooltipHeight = el.offsetHeight;
        const viewportWidth = currentWindow.innerWidth;
        const viewportHeight = currentWindow.innerHeight;

        if (newLeft + tooltipWidth > viewportWidth + currentWindow.scrollX) {
            newLeft = event.clientX + currentWindow.scrollX - tooltipWidth - offsetX;
        }
        if (newTop + tooltipHeight > viewportHeight + currentWindow.scrollY) {
            newTop = event.clientY + currentWindow.scrollY - tooltipHeight - offsetY;
        }

        newLeft = Math.max(newLeft, currentWindow.scrollX + offsetX);
        newTop = Math.max(newTop, currentWindow.scrollY + offsetY);

        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
    }

    public destroy() {
        this.hideTimeout && clearTimeout(this.hideTimeout);

        const activeWindows = [document, ...this.getPopoutWindows()];
        activeWindows.forEach(doc => {
            const el = doc.getElementById('drawio-external-link-tooltip');
            if (el) el.remove();
        });

        this.tooltipElement = null;
        ExternalLinkTooltip.instance = null;
    }

    private getPopoutWindows(): Document[] {
        const docs: Document[] = [];
        // @ts-ignore
        const floatingLeaves = app.workspace.floatingSplit?.children || [];
        for (const leaf of floatingLeaves) {
            if (leaf.doc) docs.push(leaf.doc);
        }
        return docs;
    }
}