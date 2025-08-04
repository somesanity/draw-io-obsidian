export class ExternalTooltip {
    private tooltipElement: HTMLElement;
    private hideTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.classList.add('drawio-custom-tooltip');
        this.tooltipElement.style.position = 'absolute';
        this.tooltipElement.style.display = 'none';
        this.tooltipElement.style.zIndex = '9999';

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
    this.tooltipElement.style.display = 'block';
    this.updatePosition(event);
}

    public hide(delay = 100) {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        this.hideTimeout = setTimeout(() => {
            this.tooltipElement.style.display = 'none';
        }, delay);
    }

    public updatePosition(event: MouseEvent) {
        const offsetX = 15;
        const offsetY = 15;

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