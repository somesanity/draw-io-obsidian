import DrawioPlugin from "main";
import { MarkdownPostProcessorContext, Plugin, Setting } from "obsidian";

export function drawioHoverResizeProcessor(plugin: DrawioPlugin) {
    const desired = plugin.settings.HoverSizeDiagram;

    const isTarget = (node: Element) => {
        return node.matches && (
            node.matches('img[src*=".drawio.svg"]') || 
            node.matches('span.internal-embed[src*=".drawio.svg"]')
        );
    };

    const applyResize = (el: HTMLElement) => {
        if (!el.closest('.hover-popover')) return;

        if (el.getAttribute("width") === desired && el.style.width === desired) return;

        el.setAttribute("width", desired);
        el.style.width = desired;
        
        const svg = el.querySelector('svg');
        if (svg) {
            svg.style.width = plugin.settings.HoverSizeDiagram;
        }
    };

    const observePopover = () => {
        const popovers = document.querySelectorAll(".hover-popover");

        popovers.forEach(pop => {
            if ((pop as HTMLElement).dataset.resizeObserverAttached === "1") return;
            (pop as HTMLElement).dataset.resizeObserverAttached = "1";

            const observer = new MutationObserver(mutations => {
                for (const m of mutations) {
                    if (m.type === "childList") {
                        m.addedNodes.forEach(node => {
                            if (!(node instanceof HTMLElement)) return;

                            if (isTarget(node)) applyResize(node);

                            const children = node.querySelectorAll('img[src*=".drawio.svg"], span.internal-embed[src*=".drawio.svg"]');
                            children.forEach(ch => applyResize(ch as HTMLElement));
                        });
                    }
                    if (m.type === "attributes") {
                        const el = m.target as HTMLElement;
                        if (isTarget(el)) applyResize(el);
                    }
                }
            });

            observer.observe(pop, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ["src", "class", "width"]
            });

            plugin.register(() => observer.disconnect());
        });
    };

    const interval = window.setInterval(observePopover, 500);
    plugin.register(() => clearInterval(interval));

    return (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        setTimeout(() => {
            el.querySelectorAll('img[src*=".drawio.svg"], span.internal-embed[src*=".drawio.svg"]')
                .forEach(t => applyResize(t as HTMLElement));
        }, 0);
        
        setTimeout(() => {
            el.querySelectorAll('img[src*=".drawio.svg"], span.internal-embed[src*=".drawio.svg"]')
                .forEach(t => applyResize(t as HTMLElement));
        }, 100);
    };
}