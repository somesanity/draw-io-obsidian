import { PERCENT_SIZE_REGEX } from "consts";
import DrawioPlugin from "main";

export async function PercentSize(plugin: DrawioPlugin) {
return plugin.registerMarkdownPostProcessor((element, context) => {

    const observer = new MutationObserver((mutationsList, observer) => {
        const foundMedia = element.findAll("span.media-embed")
        
        if(foundMedia.length > 0) {
            console.log(foundMedia)

            foundMedia.forEach(element => {
                
                const srcString = element.getAttribute("src");
                const altString = element.getAttribute("alt");
                
                const isDrawio = srcString?.endsWith(".drawio.svg");

                if(isDrawio && altString && PERCENT_SIZE_REGEX.test(altString)) {
                    const img = element.querySelector("img");
                    img?.setAttribute("width", altString)                }
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