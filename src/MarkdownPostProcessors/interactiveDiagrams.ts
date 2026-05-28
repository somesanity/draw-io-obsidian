import { CLEAR_INTERNAL_LINK, EXTERNAL_LINK_CHECK, INTERNAL_LINK_CHECK, MARKDOWN_FRAGMENT_SEARCH } from "consts";
import DrawioPlugin from "main";
import { TFile } from "obsidian";
import { MarkdownFragmentsObject } from "Types/MarkdownFragmentsObject";
import { ExternalLinkTooltip } from "Utils/ExternalLinkTooltip";
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

                                    svgElement.classList.add("drawio-svg");

                                    img.replaceWith(svgElement);

                                    svgelement = svgElement
                                }

                            } catch (error) {

                            }
                        }
                    }
                    // ---

                    // // md fragmnets

                    // const fragments: MarkdownFragmentsObject[] = [];

                    // const parser = new MxGraphParser();
                    // const parsedmx = parser.parse(svgelement!);
                    // console.log(parsedmx)

                    // const objects = parsedmx?.querySelectorAll("object");

                    // objects?.forEach(object => {
                    //     const objectId = object?.getAttribute("id");
                    //     const markdownFragmentId = Array.from(object.attributes).find(attr => MARKDOWN_FRAGMENT_SEARCH.test(attr.name));

                    //     console.log(markdownFragmentId);

                    //     const obs = object.getAttribute(markdownFragmentId!);

                    //     if (markdownFragmentId) {
                    //         fragments.push({
                    //             mdid: markdownFragmentId!,
                    //             id: objectId!,
                    //             markdownContent: "### Какой-то контент 1"
                    //         });
                    //     }

                    // });


                    // cells?.forEach((cell) => {
                    //     const cellid = cell.getAttribute("data-cell-id");

                    // })

                    // ---

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

                                let popoverTop: number | null = null;

                                const observerPopover = new MutationObserver((mutationsList, observer) => {
                                    const isPopoverLoaded = document.body.querySelector(".hover-popover > .markdown-embed.is-loaded") as HTMLElement | null;
                                    const popover = document.body.querySelector(".hover-popover") as HTMLElement | null;

                                    if (!isPopoverLoaded) {
                                        return
                                    }

                                    if (popover && isPopoverLoaded && popoverTop) {
                                        popover.style.setProperty("top", `${popoverTop}px`, "important");
                                        popover.style.setProperty("height", "var(--popover-height)", "important");
                                        observer.disconnect();
                                    }
                                });

                                linkItem.addEventListener("mouseenter", (event: MouseEvent) => {
                                    popoverTop = event.clientY + window.scrollY;
                                    observerPopover.observe(document.body, observerPopoverCfg);
                                });

                                linkItem.addEventListener("mouseleave", () => {
                                    observerPopover.disconnect();
                                    popoverTop = null;
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