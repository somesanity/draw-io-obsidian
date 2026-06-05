import DrawioPlugin from "main";
import { MarkdownPostProcessorContext } from "obsidian";

interface ObsidianElement extends Element {
    setCssProps(props: Record<string, string>): void;
    setCssStyles(styles: Record<string, string>): void;
}

export function SizeInHoverWindow(plugin: DrawioPlugin) {
    let desired = String(plugin.settings.diagramSizeInPopupHover).trim();

    if (!isNaN(Number(desired)) && desired !== "") {
        desired += "px";
    }

    const isTarget = (node: Element): boolean => {
        return typeof node.matches === "function" && (
            node.matches('img[src*=".drawio.svg"]') ||
            node.matches('span.internal-embed[src*=".drawio.svg"]')
        );
    };

<<<<<<< HEAD
    const applyResize = (el: HTMLElement) => {
        if (!el.closest('.hover-popover')) return;

        el.classList.add("drawio-embed-resized");
        (el as any).setCssProps({ "--drawio-popup-width": desired });

        el.setAttribute("width", desired);
=======
    const applyResize = (el: Element) => {
        const popover = el.closest('.hover-popover');
        if (!popover) return;

        popover.classList.add("drawio-popover-container");
        (popover as unknown as ObsidianElement).setCssProps({ "--drawio-popup-width": desired });

        el.classList.add("drawio-embed-resized");
>>>>>>> 7f252b204348a2cad21c617d928dce6d893bfdd0

        const svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
        if (svg) {
            svg.classList.add("drawio-embed-resized");
<<<<<<< HEAD
            (svg as any).setCssProps({ "--drawio-popup-width": desired });

            svg.setAttribute("width", desired);
=======
>>>>>>> 7f252b204348a2cad21c617d928dce6d893bfdd0
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
            applyResize(element.closest('span[src*=".drawio.svg"]') as Element);
            return;
        }

        const children = element.querySelectorAll('img[src*=".drawio.svg"], span.internal-embed[src*=".drawio.svg"]');
        children.forEach(ch => applyResize(ch));
    };

    const setupPopoverObserver = (popover: HTMLElement) => {
        if (popover.dataset.resizeObserverAttached === "1") return;
        popover.dataset.resizeObserverAttached = "1";

        processContainer(popover);

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
<<<<<<< HEAD
                if (m.type === "childList") {
                    m.addedNodes.forEach(node => {
                        if (node instanceof HTMLElement) processContainer(node);
                    });
                } else if (m.type === "attributes") {
                    const el = m.target as HTMLElement;
                    if (isTarget(el) || el.tagName?.toLowerCase() === 'svg') {
                        applyResize(el);
=======
                m.addedNodes.forEach(node => {
                    if (node instanceof HTMLElement) {
                        processContainer(node);
>>>>>>> 7f252b204348a2cad21c617d928dce6d893bfdd0
                    }
                });
            }
        });

        observer.observe(popover, {
            subtree: true,
            childList: true,
            attributes: true,
<<<<<<< HEAD
            attributeFilter: ["src", "class", "width"]
=======
            attributeFilter: ["src", "class"]
>>>>>>> 7f252b204348a2cad21c617d928dce6d893bfdd0
        });

        const disconnectObserver = new MutationObserver((mutations, obs) => {
            for (const m of mutations) {
                for (const node of m.removedNodes) {
                    if (node === popover || node.contains(popover)) {
                        observer.disconnect();
                        obs.disconnect();
                        delete popover.dataset.resizeObserverAttached;
                    }
                }
            }
        });

        disconnectObserver.observe(popover.parentElement || document.body, { childList: true });
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