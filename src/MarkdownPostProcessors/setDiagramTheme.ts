import DrawioPlugin from "main";
import { pluginUtils } from "Utils/PluginUtils";

export async function setDiagramsTheme(plugin: DrawioPlugin) {
    return plugin.registerMarkdownPostProcessor((element, context) => {
        const utils = new pluginUtils(plugin);

        if (plugin.settings.interactiveDiagrams) {

            const observer = new MutationObserver((mutationsList, observer) => {
                const foundMedia = element.findAll("span.media-embed");

                if (foundMedia.length > 0) {
                    foundMedia.forEach(embedEl => {

                        const srcString = embedEl.getAttribute("src");
                        const isDrawio = srcString?.endsWith(".drawio.svg");

                        if (isDrawio) {
                            const diagramSvg = embedEl.querySelectorAll("svg");

                            if (diagramSvg && diagramSvg.length > 0) {

                                diagramSvg.forEach(svg => {
                                    if (svg.classList.contains("drawio-theme-applied")) return;

                                    const themeClass = utils.setDiagramsTheme("previewMode");
                                    console.log("Красим SVG:", svg);

                                    if (themeClass) {
                                        svg.removeClass("drawio-diagrams--lightTheme", "drawio-diagrams--darkTheme");
                                        svg.addClass(themeClass);
                                    }
                                });
                            }
                        }
                    });
                }
            });

            const observerCfg = {
                childList: true,
                subtree: true,
            };

            observer.observe(element, observerCfg);
        } else {
            const observer = new MutationObserver((mutationsList, observer) => {
                const foundMedia = element.findAll("span.media-embed")

                if (foundMedia.length > 0) {
                    foundMedia.forEach(element => {

                        const srcString = element.getAttribute("src");

                        const isDrawio = srcString?.endsWith(".drawio.svg");

                        if (isDrawio) {
                            const diagrams = element.find("img");

                            diagrams ? diagrams.addClass(`${utils.setDiagramsTheme("previewMode")}`) : "";
                        }
                    });

                    observer.disconnect();
                }
            })

            const observerCfg = {
                childList: true,
                subtree: true,
            }

            observer.observe(element, observerCfg)
        }
    })
}