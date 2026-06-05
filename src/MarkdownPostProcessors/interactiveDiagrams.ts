import { CLEAR_INTERNAL_LINK, EXTERNAL_LINK_CHECK, INTERNAL_LINK_CHECK, MARKDOWN_FRAGMENT_SEARCH } from "consts";
import DrawioPlugin from "main";
import { TFile } from "obsidian";
import { MarkdownFragmentsObject } from "Types/MarkdownFragmentsObject";
import { ExternalLinkTooltip } from "Utils/ExternalLinkTooltip";
import { MarkdownTooltip } from "Utils/markdownTooltip";
import { MxGraphParser } from "Utils/MxGraphParser";

export async function interactiveDiagramss(plugin: DrawioPlugin) {
    return plugin.registerMarkdownPostProcessor((element, context) => {

        const observer = new MutationObserver((mutationsList, observer) => {
            const foundMedia = element.findAll("span.media-embed")

            if (foundMedia.length > 0) {
                foundMedia.forEach(async element => {

                    // create svg

                    const srcString = element.getAttribute("src");

                    const isDrawio = srcString?.endsWith(".drawio.svg");

                    const img = element.querySelector("img");

                    let svgelement: SVGElement | null = null;

                    if (isDrawio && img) {
                        const file = plugin.app.metadataCache.getFirstLinkpathDest(srcString!, "");

                        if (file instanceof TFile) {
                            try {
                                const svgContent = await plugin.app.vault.read(file);

                                const parser = new DOMParser();
                                const svgParsedDoc = parser.parseFromString(svgContent, "image/svg+xml");
                                const svgElement = svgParsedDoc.querySelector("svg");

                                if (svgElement) {
                                    if (img.hasAttribute("width")) {
                                        svgElement.setAttribute("width", img.getAttribute("width")!);
                                        svgElement.setAttribute("height", "auto");
                                    }

                                    svgElement.classList.add("drawio-interactive-diagram");

                                    img.replaceWith(svgElement);

                                    svgelement = svgElement
                                }

                            } catch (error) {

                            }
                        }
                    }
                    // ---

                    // // md fragmnets

                    const parser = new MxGraphParser();
                    const parsedmx = parser.parse(svgelement!);

                    if (parsedmx) {
                        const objects = parsedmx.querySelectorAll("object");
                        const markdownTooltip = MarkdownTooltip.getInstance();

                        objects.forEach(object => {
                            const objectId = object.getAttribute("id");
                            if (!objectId) return;

                            const markdownAttr = Array.from(object.attributes).find(attr => MARKDOWN_FRAGMENT_SEARCH.test(attr.name));

                            if (markdownAttr) {
                                const markdownContent = markdownAttr.value;

                                const cell = svgelement!.querySelector(`[data-cell-id="${objectId}"]`);

                                if (cell) {
                                    cell.addEventListener("mouseenter", (event: MouseEvent) => {
                                        markdownTooltip.show(plugin.app, markdownContent, event, context.sourcePath, plugin);
                                    });

                                    cell.addEventListener("mouseleave", () => {
                                        markdownTooltip.hide();
                                    });
                                }
                            }
                        });
                    }

                    // extend links

                    const externalLinkTooltip = ExternalLinkTooltip.getInstance();

                    if (svgelement) {
                        const links = svgelement.querySelectorAll<SVGAElement>("a[*|href], a[href]");

                        links.forEach((linkItem) => {
                            const href = linkItem.getAttribute("xlink:href") || linkItem.getAttribute("href");

                            if (!href) return;

                            const isExternal = EXTERNAL_LINK_CHECK.test(href.trim());
                            const isInternal = INTERNAL_LINK_CHECK.test(href.trim())

                            if (isExternal) {
                                linkItem.addEventListener("mouseenter", (event: MouseEvent) => {
                                    externalLinkTooltip.show(href, event);
                                });

                                linkItem.addEventListener("mousemove", (event: MouseEvent) => {
                                    externalLinkTooltip.updatePosition(event);
                                });

                                linkItem.addEventListener("mouseleave", () => {
                                    externalLinkTooltip.hide();
                                });
                            }

                            if (isInternal) {
                                let cleanpath = decodeURIComponent(href.trim().replace(CLEAR_INTERNAL_LINK, "").trim());

                                linkItem.setAttribute("data-href", cleanpath);
                                linkItem.setAttribute("href", cleanpath);
                                linkItem.classList.add("internal-link");

                                let mouseX: number | null = null;
                                let mouseY: number | null = null;

                                const observerPopover = new MutationObserver((mutationsList) => {
                                    const popover = document.body.querySelector(".hover-popover") as HTMLElement | null;

                                    if (!popover || mouseX === null || mouseY === null) return;

                                    const popoverWidth = popover.offsetWidth || 400;
                                    const popoverHeight = popover.offsetHeight || 300;

                                    const windowWidth = window.innerWidth;
                                    const windowHeight = window.innerHeight;
                                    const scrollX = window.scrollX;
                                    const scrollY = window.scrollY;

                                    let targetLeft = mouseX + 15;
                                    let targetTop = mouseY + 15;

                                    if (targetLeft + popoverWidth > scrollX + windowWidth) {
                                        targetLeft = mouseX - popoverWidth - 15;
                                    }

                                    if (targetTop + popoverHeight > scrollY + windowHeight) {
                                        targetTop = mouseY - popoverHeight - 15;
                                    }

                                    if (targetLeft < scrollX) targetLeft = scrollX + 10;
                                    if (targetTop < scrollY) targetTop = scrollY + 10;

                                    const strTop = `${targetTop}px`;
                                    const strLeft = `${targetLeft}px`;

                                    if (
                                        popover.style.top !== strTop ||
                                        popover.style.left !== strLeft ||
                                        popover.style.right !== "auto"
                                    ) {
                                        popover.style.setProperty("top", strTop, "important");
                                        popover.style.setProperty("left", strLeft, "important");
                                        popover.style.setProperty("right", "auto", "important");
                                        popover.style.setProperty("height", "var(--popover-height)", "important");
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

                });

                observer.disconnect();
            }
        })

        const observerCfg = {
            childList: true,
            subtree: true,
        }

        const observerPopoverCfg = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style']
        };

        observer.observe(element, observerCfg)
    })
}