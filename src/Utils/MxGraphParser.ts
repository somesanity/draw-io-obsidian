import pako from "pako";

export class MxGraphParser {
    private domParser = new DOMParser();

    public parse(svg: string | SVGElement): Document | null {
        try {
            let contentString = "";
            if (svg instanceof SVGElement) {
                contentString = svg.getAttribute("content") || "";
            } else {
                const doc = this.domParser.parseFromString(svg, "image/svg+xml");
                contentString = doc.querySelector("svg")?.getAttribute("content") || "";
            }

            if (!contentString) throw new Error("Атрибут 'content' не найден в SVG");

            const wrapperDoc = this.domParser.parseFromString(contentString, "application/xml");
            const diagramNode = wrapperDoc.querySelector("diagram");
            if (!diagramNode || !diagramNode.textContent) {
                throw new Error("Тег <diagram> пуст или отсутствует");
            }

            const base64Text = diagramNode.textContent.trim();
            const binaryString = atob(base64Text);

            const charCodes = Array.from(binaryString).map(char => char.charCodeAt(0));
            const byteArray = new Uint8Array(charCodes);

            const inflatedString = pako.inflateRaw(byteArray, { to: "string" });

            let cleanXmlText = inflatedString;
            if (cleanXmlText.includes("%")) {
                cleanXmlText = decodeURIComponent(cleanXmlText);
            } else {
                cleanXmlText = unescape(cleanXmlText);
            }

            return this.domParser.parseFromString(cleanXmlText, "application/xml");

        } catch (error) {
            console.error("[MxGraphParser] Ошибка парсинга структуры:", error);
            return null;
        }
    }
}