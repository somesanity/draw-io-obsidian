
import { DrawioDecoder } from "handlers/drawioDataDecoder";
import { ExternalTooltip } from "handlers/externalTooltip";
import { getFileContent } from "handlers/getFileContent";
import DrawioPlugin from "main";
import { App, MarkdownPostProcessorContext, MarkdownRenderer, TFile } from "obsidian";

export async function InteractiveDiagrams(plugin: DrawioPlugin, app: App) {
	if (!plugin.settings.interactiveDiagram) return;
	
	const tooltip = new ExternalTooltip();
	const decoder = new DrawioDecoder();


	const component = plugin;

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
			} if (img.hasAttribute('alt') && img.getAttribute('alt').includes('%')) {
				imgSizee = img.getAttribute('alt')
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
	

const model = decoder.extractDiagramData(svgElement);
if (!model) return;

const cellElements = svgElement.querySelectorAll('g[data-cell-id]');

for (const cellElement of cellElements) {
	const cellId = cellElement.getAttribute('data-cell-id');
	if (!cellId) continue;

	const objectNode = model.querySelector(`object[id="${cellId}"]`);
	if (!objectNode) continue;

	const markdownParts: string[] = [];

	for (const attr of Array.from(objectNode.attributes)) {
		if (attr.name.startsWith('md-') && attr.value.trim()) {
			markdownParts.push(attr.value.trim());
		}
	}

	if (markdownParts.length === 0) continue;

	const tooltipDiv = createDiv({attr: { 'data-tooltip-id': cellId } });
	tooltipDiv.addClass('drawio-markdown-tooltip')

	el.appendChild(tooltipDiv);

	await MarkdownRenderer.render(
		app,
		markdownParts.join('\n\n'),
		tooltipDiv,
		ctx.sourcePath,
		plugin
	).catch(err => console.error('Markdown render error:', err));

	let hideTimeout: number | null = null;

const showTooltip = (event: MouseEvent) => {
	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}

	const elRect = el.getBoundingClientRect();

	const relativeX = event.clientX - elRect.left;
	const relativeY = event.clientY - elRect.top;

	tooltipDiv.style.left = `${relativeX + 70}px`;
	tooltipDiv.style.top = `${relativeY + 10}px`;
	tooltipDiv.style.display = 'block';
};




	const scheduleHideTooltip = () => {
		hideTimeout = window.setTimeout(() => {
			tooltipDiv.style.display = 'none';
		}, 200);
	};

	const cancelHide = () => {
		if (hideTimeout !== null) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}
	};

	cellElement.addEventListener('mouseenter', showTooltip);
	cellElement.addEventListener('mouseleave', scheduleHideTooltip);

	tooltipDiv.addEventListener('mouseenter', cancelHide);
	tooltipDiv.addEventListener('mouseleave', scheduleHideTooltip);
}


	const links = svgElement.querySelectorAll('a');

	for(const link of links) {
	
		const hrefLink = link.getAttribute('xlink:href');
		let cleanHref = hrefLink;

		const externalLinks = hrefLink.match(/^https?:\/\//);

		if(externalLinks) {
			cleanHref = externalLinks.input
			link.addClass('external-link')

			const moveHandler = tooltip.updatePosition.bind(tooltip);

			link.addEventListener('mouseenter', (event) => {
			tooltip.show(cleanHref, event as MouseEvent);
			document.addEventListener('mousemove', moveHandler);
		});

		link.addEventListener('mouseleave', () => {
			tooltip.hide();
			document.removeEventListener('mousemove', moveHandler);
		});
		};

		const matchRound = hrefLink.match(/\[.*?\]\((.*?)\)/);
		if (matchRound) {
			cleanHref = matchRound[1];
			link.addClass('internal-link')
		}

		const matchDoubleSquare = hrefLink.match(/\[\[(.*?)\]\]/);
		if (matchDoubleSquare) {
			cleanHref = matchDoubleSquare[1];
			link.addClass('internal-link')
		}

		link.setAttribute('href', cleanHref);
	}
	
	}
	});
}