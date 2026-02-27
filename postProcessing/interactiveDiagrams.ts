import { DrawioDecoder } from "handlers/drawioDataDecoder";
import { ExternalTooltip } from "handlers/externalTooltip";
import { getFileContent } from "handlers/getFileContent";
import DrawioPlugin from "main";
import {
	App,
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	TFile
} from "obsidian";

export async function InteractiveDiagrams(plugin: DrawioPlugin, app: App) {
	if (!plugin.settings.interactiveDiagram) return;

	const tooltip = new ExternalTooltip();
	const decoder = new DrawioDecoder();

	plugin.registerMarkdownPostProcessor(
		async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			const embeds = el.querySelectorAll<HTMLSpanElement>(
				'span.internal-embed[src$=".drawio.svg"]'
			);

			for (const embed of Array.from(embeds)) {
				embed.addClass("drawio-container");

				const file = getFileContent(embed, plugin.app);
				if (!(file instanceof TFile)) continue;

				const data = await plugin.app.vault.read(file);
				const img = embed.querySelector("img");
				if (!img) continue;

				let imgSize: string | null = null;
				if (img.hasAttribute("width")) {
					imgSize = img.getAttribute("width");
				}

				const temp = document.createElement("div");
				temp.innerHTML = data;
				const svgElement = temp.querySelector("svg");
				if (!svgElement) continue;

				img.replaceWith(svgElement);
				svgElement.classList.add("drawio-svg");

				if (imgSize !== null) {
					if (!imgSize.includes("%")) {
						svgElement.setAttribute("width", imgSize + "px");
					} else {
						svgElement.setAttribute("width", imgSize);
					}
					svgElement.setAttribute("height", "100%");
				}

				if (document.body.classList.contains("theme-light")) {
					svgElement.classList.add("drawio-scheme-light");
				} else {
					svgElement.classList.add("drawio-scheme-dark");
				}

				const model = decoder.extractDiagramData(svgElement);
				if (!model) continue;

				const cellElements = svgElement.querySelectorAll<SVGGElement>(
					'g[data-cell-id]'
				);

				for (const cellElement of Array.from(cellElements)) {
					const cellId = cellElement.getAttribute("data-cell-id");
					if (!cellId) continue;

					const objectNode = model.querySelector(`object[id="${cellId}"]`);
					if (!objectNode) continue;

					const markdownParts: string[] = [];
					for (const attr of Array.from(objectNode.attributes)) {
						if (attr.name.startsWith("md-") && attr.value.trim()) {
							markdownParts.push(attr.value.trim());
						}
					}

					if (markdownParts.length === 0) continue;

					cellElement.addClass('interactiveElement')

					const tooltipDiv = createDiv({ attr: { "data-tooltip-id": cellId } });
					tooltipDiv.classList.add(
						"drawio-markdown-tooltip",
						"drawio-markdown-tooltip--hidden"
					);

					el.appendChild(tooltipDiv);

					await MarkdownRenderer.render(
						app,
						markdownParts.join("\n\n"),
						tooltipDiv,
						ctx.sourcePath,
						plugin
					).catch((err) =>
						console.error("Markdown render error:", err)
					);

					let hideTimeout: number | null = null;

					
					const showTooltip = (event: MouseEvent) => {
						if (hideTimeout) {
							clearTimeout(hideTimeout);
							hideTimeout = null;
					}

					tooltipDiv.classList.remove("drawio-markdown-tooltip--hidden");
					tooltipDiv.classList.add("drawio-markdown-tooltip--show");

					tooltipDiv.style.left = `${event.clientX / 2}px`;
					tooltipDiv.style.top = `${event.clientY}px`;
			};

					const hideTooltip = () => {
						hideTimeout = window.setTimeout(() => {
							tooltipDiv.classList.remove(
								"drawio-markdown-tooltip--show"
							);
						}, 200);
					};

					cellElement.addEventListener("mouseenter", showTooltip);
					cellElement.addEventListener("mouseleave", hideTooltip);

					tooltipDiv.addEventListener("mouseenter", () => {
						if (hideTimeout) {
							clearTimeout(hideTimeout);
							hideTimeout = null;
						}
					});

					tooltipDiv.addEventListener("mouseleave", hideTooltip);
				}

				const links = svgElement.querySelectorAll<SVGAElement>("a");

				for (const link of Array.from(links)) {
					const hrefLink = link.getAttribute("xlink:href") ?? "";
					let cleanHref = hrefLink;

					const externalMatch = hrefLink.match(/^https?:\/\//);
					if (externalMatch) {
						cleanHref = externalMatch.input ?? hrefLink;
						link.classList.add("external-link");

						const moveHandler = tooltip.updatePosition.bind(tooltip);

						link.addEventListener("mouseenter", (event) => {
							tooltip.show(cleanHref, event as MouseEvent);
							document.addEventListener("mousemove", moveHandler);
						});

						link.addEventListener("mouseleave", () => {
							tooltip.hide();
							document.removeEventListener("mousemove", moveHandler);
						});
					}

					const matchRound = hrefLink.match(/\[.*?\]\((.*?)\)/);
					if (matchRound) {
						cleanHref = matchRound[1];
						link.classList.add("internal-link");
					}

					const matchDoubleSquare = hrefLink.match(/\[\[([^|\]\n\r]+)(?:\|[^\]\n\r]*)?\]\]/);
					if (matchDoubleSquare) {
						cleanHref = matchDoubleSquare[1];
						link.classList.add("internal-link");		
					}

					link.addEventListener("mouseenter", (event) => {
						if(link.hasClass('internal-link')) {
						setTimeout(() => {
						const linkPreview = document.querySelector(".popover") as HTMLElement | null;
						if (linkPreview) {
						linkPreview.style.top = event.clientY + "px";
						linkPreview.style.left = event.clientX + "px";
						}
					}, 400);
						}
					});

					link.setAttribute("href", cleanHref);
				}
			}
		}
	);
}