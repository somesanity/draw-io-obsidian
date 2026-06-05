import DrawioPlugin from "main";
import { MarkdownPostProcessorContext } from "obsidian";

interface ObsidianElement extends Element {
    setCssProps(props: Record<string, string>): void;
    setCssStyles(styles: Record<string, string>): void;
}

export function SizeInHoverWindow(plugin: DrawioPlugin) {
    // Получаем значение из настроек
    let desired = String(plugin.settings.diagramSizeInPopupHover).trim();

    // Если это просто число (например, "800"), добавляем "px" для валидного CSS
    if (!isNaN(Number(desired)) && desired !== "") {
        desired += "px";
    }

    const isTarget = (node: Element): boolean => {
        return typeof node.matches === "function" && (
            node.matches('img[src*=".drawio.svg"]') ||
            node.matches('span.internal-embed[src*=".drawio.svg"]')
        );
    };

    const applyResize = (el: Element) => {
        const popover = el.closest('.hover-popover');
        if (!popover) return;

        // Применяем стили и переменную К САМОМУ ПОПОВЕРУ, чтобы он мог растянуться
        popover.classList.add("drawio-popover-container");
        (popover as unknown as ObsidianElement).setCssProps({ "--drawio-popup-width": desired });

        // Добавляем классы к самому элементу (span/img)
        el.classList.add("drawio-embed-resized");

        const svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
        if (svg) {
            svg.classList.add("drawio-embed-resized");
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
                m.addedNodes.forEach(node => {
                    if (node instanceof HTMLElement) {
                        processContainer(node);
                    }
                });
            }
        });

        observer.observe(popover, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["src", "class"]
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