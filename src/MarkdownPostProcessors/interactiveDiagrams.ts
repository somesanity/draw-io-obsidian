import DrawioPlugin from "main";
import { TFile } from "obsidian";
import { applyDiagramInteractivity } from "Utils/DiagramInteractivity";

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
                    applyDiagramInteractivity(plugin, svgelement, context.sourcePath);

                });

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
