import {
    CLEAR_INTERNAL_LINK,
    EXTERNAL_LINK_CHECK,
    INTERNAL_LINK_CHECK,
    MARKDOWN_FRAGMENT_SEARCH
} from "consts";
import DrawioPlugin from "main";
import { ExternalLinkTooltip } from "./ExternalLinkTooltip";
import { MarkdownTooltip } from "./MarkdownTooltip";
import { MxGraphParser } from "./MxGraphParser";

export function applyDiagramInteractivity(
    plugin: DrawioPlugin,
    svgElement: SVGElement | null,
    sourcePath: string
) {
    if (!svgElement) return;

    const observerPopoverCfg = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style"]
    };

    const parser = new MxGraphParser();
    const parsedMx = parser.parse(svgElement);

    if (parsedMx) {
        const objects = parsedMx.querySelectorAll("object");
        const markdownTooltip = MarkdownTooltip.getInstance();

        objects.forEach(object => {
            const objectId = object.getAttribute("id");
            if (!objectId) return;

            const markdownAttr = Array.from(object.attributes)
                .find(attr => MARKDOWN_FRAGMENT_SEARCH.test(attr.name));

            if (!markdownAttr) return;

            const cell = svgElement.querySelector(`[data-cell-id="${objectId}"]`);
            if (!cell) return;

            cell.addEventListener("mouseenter", (event: Event) => {
                markdownTooltip.show(
                    plugin.app,
                    markdownAttr.value,
                    event as MouseEvent,
                    sourcePath,
                    plugin
                );
            });
            cell.addEventListener("mouseleave", () => markdownTooltip.hide());
        });
    }

    const externalLinkTooltip = ExternalLinkTooltip.getInstance();
    const links = svgElement.querySelectorAll<SVGAElement>("a[*|href], a[href]");

    links.forEach(linkItem => {
        const href = linkItem.getAttribute("xlink:href") || linkItem.getAttribute("href");
        if (!href) return;

        const isExternal = EXTERNAL_LINK_CHECK.test(href.trim());
        const isInternal = INTERNAL_LINK_CHECK.test(href.trim());

        if (isExternal) {
            linkItem.addEventListener("mouseenter", (event: MouseEvent) => {
                externalLinkTooltip.show(href, event);
            });
            linkItem.addEventListener("mousemove", (event: MouseEvent) => {
                externalLinkTooltip.updatePosition(event);
            });
            linkItem.addEventListener("mouseleave", () => externalLinkTooltip.hide());
        }

        if (isInternal) {
            const cleanPath = decodeURIComponent(href.trim().replace(CLEAR_INTERNAL_LINK, "").trim());
            linkItem.setAttribute("data-href", cleanPath);
            linkItem.setAttribute("href", cleanPath);
            linkItem.classList.add("internal-link");

            let mouseX: number | null = null;
            let mouseY: number | null = null;

            const observerPopover = new MutationObserver(() => {
                const popover = document.body.querySelector(".hover-popover") as HTMLElement | null;
                if (!popover || mouseX === null || mouseY === null) return;

                popover.classList.add("drawio-hover-position");

                const popoverWidth = popover.offsetWidth || 400;
                const popoverHeight = popover.offsetHeight || 300;
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;

                let targetLeft = mouseX + 15;
                let targetTop = mouseY + 15;

                if (targetLeft + popoverWidth > scrollX + window.innerWidth) {
                    targetLeft = mouseX - popoverWidth - 15;
                }
                if (targetTop + popoverHeight > scrollY + window.innerHeight) {
                    targetTop = mouseY - popoverHeight - 15;
                }
                if (targetLeft < scrollX) targetLeft = scrollX + 10;
                if (targetTop < scrollY) targetTop = scrollY + 10;

                if (popover.setCssProps) {
                    observerPopover.disconnect();
                    popover.setCssProps({
                        "--drawio-hover-position-top": `${targetTop}px`,
                        "--drawio-hover-position-left": `${targetLeft}px`,
                        "--drawio-hover-position-hight": "var(--popover-height)"
                    });
                    observerPopover.observe(document.body, observerPopoverCfg);
                }
            });

            linkItem.addEventListener("mouseenter", (event: MouseEvent) => {
                mouseX = event.pageX;
                mouseY = event.pageY;
                observerPopover.observe(document.body, observerPopoverCfg);
            });
            linkItem.addEventListener("mouseleave", () => {
                observerPopover.disconnect();
                mouseX = null;
                mouseY = null;
            });
        }
    });
}
