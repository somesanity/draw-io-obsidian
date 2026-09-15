import { DRAWIO_SVG_SUFFIX, DRAWIO_XML_SUFFIX } from "consts";

export function isDrawioSvgPath(path: string | null | undefined): boolean {
    return typeof path === "string" && path.toLowerCase().endsWith(DRAWIO_SVG_SUFFIX);
}

export function isDrawioXmlPath(path: string | null | undefined): boolean {
    return typeof path === "string"
        && path.toLowerCase().endsWith(DRAWIO_XML_SUFFIX)
        && !isDrawioSvgPath(path);
}

export function getSidecarPath(xmlPath: string): string {
    return `${xmlPath}.svg`;
}

export function getPrimaryXmlPath(sidecarPath: string): string {
    return sidecarPath.replace(/\.svg$/i, "");
}

export function decodeSvgDataUri(dataUri: unknown): string | null {
    if (typeof dataUri !== "string") return null;

    const base64 = dataUri.split(",")[1];
    if (!base64) return null;

    try {
        return decodeURIComponent(escape(atob(base64)));
    } catch (error) {
        return null;
    }
}

export function extractXmlFromSvg(svgText: string): string | null {
    try {
        const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const content = parsed.querySelector("svg")?.getAttribute("content");

        return content && content.trim().length > 0 ? content : null;
    } catch (error) {
        return null;
    }
}
