import { getFileContent } from "handlers/getFileContent";
import DrawioPlugin from "main";
import { MarkdownPostProcessorContext, TFile } from "obsidian";

export async function InteractiveDiagrams(plugin: DrawioPlugin) {
	if (!plugin.settings.interactiveDiagram) return;

	plugin.registerMarkdownPostProcessor(async (el, ctx: MarkdownPostProcessorContext) => {
		const embeds = el.querySelectorAll('span.internal-embed[src$=".drawio.svg"]');

		for (const embed of embeds) {

			const file = getFileContent(embed, plugin.app);
			if (!(file instanceof TFile)) continue;

			const data = await plugin.app.vault.read(file);

			const img = embed.querySelector('img');
            let imgsize = embed.getAttribute('alt')

			if (!img.getAttribute('width')) {
				imgsize = embed.getAttribute('alt')
			} else {
				imgsize = embed.getAttribute('width')
			}

			const temp = document.createElement("div");
			temp.innerHTML = data;

			const svgElement = temp.querySelector("svg");
			if (!svgElement) continue;

			svgElement.setAttribute("width", imgsize);
			svgElement.setAttribute("height", imgsize);

			img.replaceWith(svgElement);

			if(document.body.classList.contains('theme-light')) {
				svgElement.addClass('drawio-scheme-light') 
			} else {
				svgElement.addClass('drawio-scheme-dark')
			}
		}
	});
}
