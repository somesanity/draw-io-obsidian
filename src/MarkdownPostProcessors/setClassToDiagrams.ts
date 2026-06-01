import DrawioPlugin from "main";

export async function setClassToDiagrams(plugin: DrawioPlugin) {
    return plugin.registerMarkdownPostProcessor((element, context) => {

        const observer = new MutationObserver((mutationsList, observer) => {
            const foundMedia = element.findAll("span.media-embed")

            if (foundMedia.length > 0) {
                foundMedia.forEach(element => {

                    const srcString = element.getAttribute("src");

                    const isDrawio = srcString?.endsWith(".drawio.svg");

                    if (isDrawio) {
                        const diagrams = element.find("img");

                        diagrams ? diagrams.addClass("drawio-diagram") : "";
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
    })
}