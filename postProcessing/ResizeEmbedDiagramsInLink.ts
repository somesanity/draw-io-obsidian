import DrawioPlugin from "main";
import { MarkdownPostProcessor } from "obsidian";

export function drawioHoverResizeProcessor(plugin: DrawioPlugin) {
    const desired = plugin.settings.HoverSizeDiagram;

    const matches = (el: Element) =>
        el.matches('img[src*=".drawio.svg"], span.internal-embed');

    const applyResize = (el: HTMLElement) => {
        if (el.getAttribute("width") === desired) return;
        el.setAttribute("width", desired);
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

                            if (matches(node)) applyResize(node);

                            node.querySelectorAll('img[src*=".drawio.svg"], span.internal-embed')
                                .forEach(ch => applyResize(ch as HTMLElement));
                        });
                    }

                    if (m.type === "attributes") {
                        const el = m.target as HTMLElement;
                        if (matches(el)) applyResize(el);
                    }
                }
            });

            observer.observe(pop, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ["src", "width", "class"]
            });

            plugin.register(() => observer.disconnect());
        });
    };

    const interval = window.setInterval(observePopover, 200);
    plugin.register(() => clearInterval(interval));

    return (el: HTMLElement, ctx: MarkdownPostProcessor) => {
        el.querySelectorAll('img[src*=".drawio.svg"], span.internal-embed')
            .forEach(t => applyResize(t as HTMLElement));
    };
}