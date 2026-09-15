import { PERCENT_SIZE_REGEX, PIXEL_SIZE_REGEX } from "consts";
import { t } from "locales/I18n";
import DrawioPlugin from "main";
import { TFile } from "obsidian";
import { applyDiagramInteractivity } from "./DiagramInteractivity";
import { pluginUtils } from "./PluginUtils";
import { isDrawioXmlPath } from "./SidecarPaths";

export type DrawioEmbedMode = "previewMode" | "editMode";

function getEmbedLinkTarget(embedEl: HTMLElement): string {
    const src = embedEl.getAttribute("src") || "";
    return src.split("#")[0]!.trim();
}

function parseSvgMarkup(svgText: string): SVGElement | null {
    try {
        const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
        return parsed.querySelector("svg");
    } catch (error) {
        return null;
    }
}

function applyEmbedSizing(svgElement: SVGElement, altString: string | null) {
    if (!altString) return;

    const size = altString.trim();
    if (!PERCENT_SIZE_REGEX.test(size) && !PIXEL_SIZE_REGEX.test(size)) return;

    svgElement.setAttribute("width", size);
    svgElement.setAttribute("height", "auto");
}

function pruneRenderedEmbed(embedEl: HTMLElement) {
    Array.from(embedEl.children).forEach(child => {
        if (child.matches("svg.drawio-diagram, .drawio-sidecar-status")) return;
        child.remove();
    });
}

function showEmbedStatus(embedEl: HTMLElement, message: string, isError: boolean) {
    embedEl.empty();
    embedEl.createDiv({
        cls: isError
            ? "drawio-sidecar-status drawio-sidecar-status--error"
            : "drawio-sidecar-status",
        text: message
    });
}

export async function renderDrawioXmlEmbed(
    plugin: DrawioPlugin,
    embedEl: HTMLElement,
    sourcePath: string,
    mode: DrawioEmbedMode
) {
    if (embedEl.dataset.drawioSidecar) return;

    const linkText = getEmbedLinkTarget(embedEl);
    if (!isDrawioXmlPath(linkText)) return;

    let file: TFile | null = null;
    const knownPath = embedEl.dataset.drawioPath;

    if (knownPath) {
        const knownFile = plugin.app.vault.getAbstractFileByPath(knownPath);
        if (knownFile instanceof TFile) file = knownFile;
    }

    if (!file) {
        file = plugin.app.metadataCache.getFirstLinkpathDest(linkText, sourcePath || "");
    }

    if (!(file instanceof TFile)) {
        embedEl.dataset.drawioSidecar = "missing";
        return;
    }

    embedEl.dataset.drawioSidecar = "pending";
    embedEl.dataset.drawioPath = file.path;
    embedEl.addClass("drawio-xml-embed");
    embedEl.removeClasses(["mod-generic", "file-embed"]);

    if (!plugin.sidecarManager.hasFreshSidecar(file)) {
        showEmbedStatus(embedEl, t("SIDECAR__RENDERING"), false);
    }

    let svgText: string | null = null;
    try {
        svgText = await plugin.sidecarManager.getSvg(file);
    } catch (error) {
        console.error(t("SIDECAR__RENDER_FAILED"), error);
    }

    const svgElement = svgText ? parseSvgMarkup(svgText) : null;
    if (!svgElement) {
        showEmbedStatus(embedEl, t("SIDECAR__FAILED"), true);
        embedEl.dataset.drawioSidecar = "failed";
        return;
    }

    const utils = new pluginUtils(plugin);
    const isEditMode = mode === "editMode";

    svgElement.classList.add("drawio-diagram");
    if (isEditMode) svgElement.classList.add("drawio-diagram--editmode");
    if (plugin.settings.interactiveDiagrams) {
        svgElement.classList.add("drawio-interactive-diagram");
    }

    const themeClass = utils.setDiagramsTheme(isEditMode ? "editMode" : "previewMode");
    if (themeClass) svgElement.classList.add(themeClass);

    if (!svgElement.getAttribute("preserveAspectRatio")) {
        svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }

    applyEmbedSizing(svgElement, embedEl.getAttribute("alt"));
    embedEl.empty();

    if (plugin.settings.centeringDiagrams) {
        embedEl.addClass(
            isEditMode ? "drawio-centering-diagrams--editmode" : "drawio-centering-diagrams"
        );
    }

    embedEl.appendChild(svgElement);
    embedEl.dataset.drawioSidecar = "rendered";

    if (plugin.settings.interactiveDiagrams) {
        applyDiagramInteractivity(plugin, svgElement, sourcePath || "");
    }
}

export function processDrawioXmlEmbeds(
    plugin: DrawioPlugin,
    root: ParentNode,
    sourcePath: string,
    mode: DrawioEmbedMode
) {
    root.querySelectorAll<HTMLElement>(".internal-embed[src], .file-embed[src]")
        .forEach(embedEl => {
            if (!isDrawioXmlPath(getEmbedLinkTarget(embedEl))) return;

            const state = embedEl.dataset.drawioSidecar;
            if (state === "rendered" || state === "failed") {
                pruneRenderedEmbed(embedEl);
                return;
            }
            if (state === "pending") return;

            void renderDrawioXmlEmbed(plugin, embedEl, sourcePath, mode);
        });
}

export function refreshRenderedDrawioEmbeds(plugin: DrawioPlugin, xmlPath: string) {
    document.querySelectorAll<HTMLElement>(
        `[data-drawio-path="${CSS.escape(xmlPath)}"]`
    ).forEach(embedEl => {
        const mode = embedEl.closest(".cm-editor") ? "editMode" : "previewMode";
        delete embedEl.dataset.drawioSidecar;
        void renderDrawioXmlEmbed(
            plugin,
            embedEl,
            plugin.app.workspace.getActiveFile()?.path || "",
            mode
        );
    });
}
