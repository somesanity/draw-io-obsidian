import DrawioPlugin from "main";
import { Plugin, Setting } from "obsidian";

export function enableDrawioResize(DrawioPlugin: DrawioPlugin): (plugin: DrawioPlugin) => void {
    const isInsidePopover = (element: Element): boolean => {
        return element.closest('.hover-popover') !== null;
    };

    const applyAttributes = (element: HTMLElement | SVGElement) => {
        if (!isInsidePopover(element)) return;
        if (element.getAttribute("width") === DrawioPlugin.settings.HoverSizeDiagram) return; 
        element.setAttribute("width", DrawioPlugin.settings.HoverSizeDiagram);
        element.dataset.resized = "true";
    };

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) { 
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        if (checkSelector(node)) {
                            applyAttributes(node);
                        }
                        const children = node.querySelectorAll('img[src*=".drawio.svg"], span.internal-embed');
                        children.forEach((child) => applyAttributes(child as HTMLElement));
                    }
                });
            }

            if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
                const target = mutation.target;
                
                if (checkSelector(target) && isInsidePopover(target)) {
                    applyAttributes(target);
                }
            }
        }
    });

    const checkSelector = (el: Element) => {
        return el.matches('img[src*=".drawio.svg"]') || el.matches('span.internal-embed');
    }

    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['width', 'style', 'class']
    });

    return () => observer.disconnect();
}