import DrawioPlugin from "main";
import { MarkdownPostProcessor } from "obsidian";

export async function DefaultDiagramSize(plugin: DrawioPlugin) {
    if(!plugin.settings.percentSize) {
        return;
    } else {
        plugin.registerMarkdownPostProcessor((el, ctx) => {
            const embeds = el.querySelectorAll('span.internal-embed[src$=".drawio.svg"]');
            embeds.forEach((embed) => {
                const width = embed.getAttribute('alt')

                const percentpattern = /^(100|[1-9]?\d)%$/;

                if(percentpattern.test(width ?? '')) {
                    embed.setAttribute('width', width!)
                }
            })
        })
    }}