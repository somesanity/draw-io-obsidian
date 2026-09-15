import DrawioPlugin from "main";
import { processDrawioXmlEmbeds } from "Utils/DrawioXmlEmbeds";

export async function DrawioXmlEmbeds(plugin: DrawioPlugin) {
    return plugin.registerMarkdownPostProcessor((element, context) => {
        const process = () => {
            processDrawioXmlEmbeds(plugin, element, context.sourcePath, "previewMode");
        };

        process();
        requestAnimationFrame(process);
        [50, 300, 1000].forEach(delay => window.setTimeout(process, delay));
    });
}
