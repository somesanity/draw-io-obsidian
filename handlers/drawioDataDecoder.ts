import * as pako from 'pako';

export class DrawioDecoder {
	private parser = new DOMParser();

	public decodeSvg(svgContent: string): SVGSVGElement | null {
		const container = document.createElement('div');
		container.innerHTML = svgContent;

		const svgElement = container.querySelector('svg');
		if (!svgElement) return null;

		return svgElement;
	}

	public extractDiagramData(svgElement: SVGSVGElement): Document | null {
		const content = svgElement.getAttribute('content');
		if (!content) return null;

		const parsedContent = this.parser.parseFromString(content, 'application/xml');
		const diagramNode = parsedContent.querySelector('diagram');
		if (!diagramNode?.textContent) return null;

		try {
			const decoded = atob(diagramNode.textContent);
			const byteArray = new Uint8Array([...decoded].map(char => char.charCodeAt(0)));
			const inflated = pako.inflateRaw(byteArray, { to: 'string' });
			const xmlString = decodeURIComponent(inflated);
			return this.parser.parseFromString(xmlString, 'application/xml');
		} catch (error) {
			console.error('Drawio decode failed:', error);
			return null;
		}
	}
}
