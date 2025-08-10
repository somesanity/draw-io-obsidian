export class ExternalTooltip {
    private tooltipElement: HTMLElement;
    private hideTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.classList.add('drawio-external-tooltip');
        this.tooltipElement.classList.add('drawio-external-tooltip--position');

        this.tooltipElement.addEventListener('mouseenter', () => {
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
        });
        this.tooltipElement.addEventListener('mouseleave', () => {
            this.hide();
        });

        document.body.appendChild(this.tooltipElement);
    }

public show(text: string, event: MouseEvent): void {
    if (!document.body.contains(this.tooltipElement)) {
        document.body.appendChild(this.tooltipElement);
    }

    this.tooltipElement.textContent = text;
    this.tooltipElement.classList.add('drawio-external-tooltip--show');
    this.tooltipElement.classList.remove('drawio-external-tooltip--hidden');
    this.updatePosition(event);
}

    public hide(delay = 100) {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        this.hideTimeout = setTimeout(() => {
            this.tooltipElement.classList.remove('drawio-external-tooltip--show');
            this.tooltipElement.classList.add('drawio-external-tooltip--hidden');
        }, delay);
    }

public updatePosition(event: MouseEvent) {
    const styles = getComputedStyle(this.tooltipElement);

    const offsetX = parseInt(styles.getPropertyValue('--drawio-external-tooltip-offset-x'), 10) || 0;
    const offsetY = parseInt(styles.getPropertyValue('--drawio-external-tooltip-offset-y'), 10) || 0;

    let newLeft = event.clientX + window.scrollX + offsetX;
    let newTop = event.clientY + window.scrollY + offsetY;

    const tooltipWidth = this.tooltipElement.offsetWidth;
    const tooltipHeight = this.tooltipElement.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (newLeft + tooltipWidth > viewportWidth + window.scrollX) {
        newLeft = event.clientX + window.scrollX - tooltipWidth - offsetX;
    }
    if (newTop + tooltipHeight > viewportHeight + window.scrollY) {
        newTop = event.clientY + window.scrollY - tooltipHeight - offsetY;
    }

    newLeft = Math.max(newLeft, window.scrollX + offsetX);
    newTop = Math.max(newTop, window.scrollY + offsetY);

    this.tooltipElement.style.left = `${newLeft}px`;
    this.tooltipElement.style.top = `${newTop}px`;
}
}