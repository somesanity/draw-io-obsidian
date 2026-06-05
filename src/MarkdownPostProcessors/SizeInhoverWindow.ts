import DrawioPlugin from "main";
import { MarkdownPostProcessorContext } from "obsidian";

export function SizeInHoverWindow(plugin: DrawioPlugin) {
    const desired = plugin.settings.diagramSizeInPopupHover;

    const isTarget = (node: Element): boolean => {
        return typeof node.matches === "function" && (
            node.matches('img[src*=".drawio.svg"]') ||
            node.matches('span.internal-embed[src*=".drawio.svg"]')
        );
    };

    const applyResize = (el: HTMLElement) => {
        if (!el.closest('.hover-popover')) return;

        el.classList.add("drawio-embed-resized");
        (el as any).setCssProps({ "--drawio-popup-width": desired });

        el.setAttribute("width", desired);

        const svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
        if (svg) {
            svg.classList.add("drawio-embed-resized");
            (svg as any).setCssProps({ "--drawio-popup-width": desired });

            svg.setAttribute("width", desired);
            if (!svg.getAttribute("preserveAspectRatio")) {
                svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
            }
        }
    };

    const processContainer = (element: HTMLElement) => {
        if (isTarget(element)) {
            applyResize(element);
        }
        if (element.tagName?.toLowerCase() === 'svg' && element.closest('span[src*=".drawio.svg"]')) {
            applyResize(element.closest('span[src*=".drawio.svg"]') as HTMLElement);
            return;
        }

        const children = element.querySelectorAll('img[src*=".drawio.svg"], span.internal-embed[src*=".drawio.svg"]');
        children.forEach(ch => applyResize(ch as HTMLElement));
    };

    const setupPopoverObserver = (popover: HTMLElement) => {
        if (popover.dataset.resizeObserverAttached === "1") return;
        popover.dataset.resizeObserverAttached = "1";

        processContainer(popover);

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === "childList") {
                    m.addedNodes.forEach(node => {
                        if (node instanceof HTMLElement) processContainer(node);
                    });
                } else if (m.type === "attributes") {
                    const el = m.target as HTMLElement;
                    if (isTarget(el) || el.tagName?.toLowerCase() === 'svg') {
                        applyResize(el);
                    }
                }
            }
        });

        observer.observe(popover, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["src", "class", "width"]
        });

        plugin.register(() => observer.disconnect());
    };

    const bodyObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            m.addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) return;
                if (node.classList?.contains('hover-popover')) {
                    setupPopoverObserver(node);
                } else {
                    const popovers = node.querySelectorAll?.('.hover-popover');
                    popovers?.forEach(pop => setupPopoverObserver(pop as HTMLElement));
                }
            });
        }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
    plugin.register(() => bodyObserver.disconnect());

    document.querySelectorAll(".hover-popover").forEach(pop => setupPopoverObserver(pop as HTMLElement));

    return (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        requestAnimationFrame(() => processContainer(el));
        setTimeout(() => processContainer(el), 50);
    };
}