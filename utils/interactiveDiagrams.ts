
import { getFileContent } from "handlers/getFileContent";
import DrawioPlugin from "main";
import { MarkdownPostProcessorContext, TFile } from "obsidian";

export async function InteractiveDiagrams(plugin: DrawioPlugin) {
	if (!plugin.settings.interactiveDiagram) return;

	plugin.registerMarkdownPostProcessor(async (el, ctx: MarkdownPostProcessorContext) => {
		const embeds = el.querySelectorAll('span.internal-embed[src$=".drawio.svg"]');
		for (const embed of embeds) {

			embed.addClass('drawio-container')
			const file = getFileContent(embed, plugin.app);

			if (!(file instanceof TFile)) continue;

			const data = await plugin.app.vault.read(file);

			const img = embed.querySelector('img');

			let imgSizee = null;

			if(img.hasAttribute('width')) {
				imgSizee = img.getAttribute('width');
			} if (img.getAttribute('alt').includes('%')) {
				imgSizee = img.getAttribute('alt');
			}

			const temp = document.createElement("div");
			temp.innerHTML = data;

			const svgElement = temp.querySelector("svg");
			if (!svgElement) continue;

			img.replaceWith(svgElement);

			svgElement.addClass('drawio-svg')

			if (imgSizee !== null && !imgSizee.includes('%')) {
				svgElement.setAttribute('width', imgSizee + 'px');
				svgElement.setAttribute('height', '100%');
			} else if (imgSizee !== null) {
				svgElement.setAttribute('width', imgSizee);
				svgElement.setAttribute('height', '100%');
			}


			if(document.body.classList.contains('theme-light')) {
				svgElement.addClass('drawio-scheme-light') 
			} else {
				svgElement.addClass('drawio-scheme-dark')
			}
	
	const links = svgElement.querySelectorAll('a');

	for(const link of links) {
		link.addClass('internal-link')
	
		const hrefLink = link.getAttribute('xlink:href');
		let cleanHref = hrefLink;

		const matchRound = hrefLink.match(/\[.*?\]\((.*?)\)/);
		if (matchRound) {
			cleanHref = matchRound[1];
		}

		const matchDoubleSquare = hrefLink.match(/\[\[(.*?)\]\]/);
		if (matchDoubleSquare) {
			cleanHref = matchDoubleSquare[1]; // fsdfds
		}

		link.setAttribute('href', cleanHref);
	}
	
	}
	});
}