import DrawioPlugin from "main";
import { pluginUtils } from "./PluginUtils";
import { normalizePath, TFile, WorkspaceLeaf, Notice } from "obsidian";
import { t } from "locales/I18n";
import { DRAWIO_SVG_SUFFIX, DRAWIO_XML_SUFFIX } from "consts";
import {
  decodeSvgDataUri,
  extractXmlFromSvg,
  getPrimaryXmlPath,
  isDrawioSvgPath,
  isDrawioXmlPath
} from "./SidecarPaths";

export class DrawioAppController {

  private plugin: DrawioPlugin
  private iframe: HTMLIFrameElement
  private url: string
  private Utils: pluginUtils

  public file: TFile | null = null
  public fileName: string | null = null
  private pendingXml: string | null = null

  private leaf?: WorkspaceLeaf | null;

  constructor(plugin: DrawioPlugin, iframe: HTMLIFrameElement, url: string, leaf?: WorkspaceLeaf) {
    this.plugin = plugin
    this.iframe = iframe
    this.url = url;
    this.Utils = new pluginUtils(this.plugin)
    this.leaf = leaf ? leaf : null;
  }

  async handleDrawIoMessage() {
    const listener = async (event: MessageEvent) => {
      if (event.origin !== this.url) { return; }

      if (!this.iframe || event.source !== this.iframe.contentWindow) { return; }

      const data = JSON.parse(event.data);

      switch (data.event) {
        case "init": this.onInit()
          break
        case "save": this.onSaveData(data)
          break
        case "export": this.onExportData(data)
          break
      }
    }

    window.addEventListener("message", listener);

    return listener;
  }

  async onInit() {
    const messageToDrawIo = {
      action: 'load',
      xml: ""
    };

    if (this.file) {
      const data = await this.plugin.app.vault.read(this.file);

      const messageToEditDrawIo = {
        action: 'load',
        xml: data
      };

      this.fileName = normalizePath(this.file.path);

      return this.iframe.contentWindow?.postMessage(JSON.stringify(messageToEditDrawIo), this.Utils.getServerUrl("baseurl"));
    }

    return this.iframe.contentWindow?.postMessage(JSON.stringify(messageToDrawIo), this.Utils.getServerUrl("baseurl"));
  }

  onSaveData(data: any) {
    this.pendingXml = typeof data?.xml === "string" && data.xml.length > 0
      ? data.xml
      : null;

    this.iframe.contentWindow?.postMessage(JSON.stringify({
      action: 'export',
      format: 'xmlsvg',
    }), this.url);
  }

  async onExportData(data: any) {
    const svg = decodeSvgDataUri(data.data);
    if (!svg) return;

    const xml = typeof data.xml === "string" && data.xml.length > 0
      ? data.xml
      : this.pendingXml || extractXmlFromSvg(svg);
    this.pendingXml = null;

    if (this.file && await this.plugin.app.vault.adapter.exists(this.file.path)) {
      let file = this.plugin.app.vault.getFileByPath(this.file.path);

      if (file && isDrawioSvgPath(file.path)) {
        const primary = this.plugin.app.vault.getAbstractFileByPath(getPrimaryXmlPath(file.path));
        if (primary instanceof TFile) file = primary;
      }

      if (file) {
        if (isDrawioXmlPath(file.path)) {
          this.plugin.sidecarManager.markInternalWrite(file.path);
          if (xml) {
            await this.plugin.app.vault.modify(file, xml);
          }
          await this.plugin.sidecarManager.writeSidecar(file, svg);
        } else {
          await this.plugin.app.vault.modify(file, svg);
        }

        this.file = file;
        new Notice(t("DRAWIO_NOTICE__DIAGRAM_SAVED").replace("{name}", file.name));
        this.Utils.refreshLeaves();
        return;
      }
    }

    const keepXmlFormat = this.plugin.settings.newDiagramFormat !== "drawio-svg" && !!xml;
    const newFileName = await this.Utils.getFileNameForSave(
      keepXmlFormat ? DRAWIO_XML_SUFFIX : DRAWIO_SVG_SUFFIX
    );
    if (!newFileName) return;

    const file = await this.plugin.app.vault.create(newFileName, keepXmlFormat ? xml! : svg);
    if (keepXmlFormat) {
      await this.plugin.sidecarManager.writeSidecar(file, svg);
    }
    this.file = file;

    new Notice(t("DRAWIO_NOTICE__DIAGRAM_CREATED").replace("{name}", file.name));

    if (this.leaf) {
      const currentStatus = this.leaf.getViewState();

      await this.leaf.setViewState({
        ...currentStatus,
        state: {
          ...currentStatus.state,
          file: file
        }
      }, { history: false });
    }
  }

  public set setFiletoEdit(file: TFile) {
    this.file = file;
  }

  public get setFiletoEdit(): TFile | null {
    if (this.file) {
      return this.file;
    }

    return null;
  }
}