import DrawioPlugin from "main";
import { TFile } from "obsidian";
import { ExternalLinkTooltip } from "Utils/ExternalLinkTooltip";

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

                    // extend links

                    console.log(svgelement)

                    const externalLinkTooltip = ExternalLinkTooltip.getInstance();

                    if (svgelement) {
                        const links = svgelement.querySelectorAll<SVGAElement>("a[*|href], a[href]");

                        links.forEach((linkItem) => {
                            const href = linkItem.getAttribute("xlink:href") || linkItem.getAttribute("href");

                            if (!href) return;

                            const isExternal = /^(https?|mailto|ftp):/i.test(href.trim());

                            if (!isExternal) return;

                            linkItem.addEventListener("mouseenter", (event: MouseEvent) => {
                                externalLinkTooltip.show(href, event);
                            });

                            linkItem.addEventListener("mousemove", (event: MouseEvent) => {
                                externalLinkTooltip.updatePosition(event);
                            });

                            linkItem.addEventListener("mouseleave", () => {
                                externalLinkTooltip.hide();
                            });
                        });
                    }

                });

                // ---

                observer.disconnect();
            }
        })

        const observerCfg = {
            childList: true,
            subtree: true,
        }

        observer.observe(element, observerCfg)
    })
}