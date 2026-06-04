import DrawioPlugin from "main";
import { App, Editor, MarkdownView, normalizePath, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { savingNameFileFormatOption } from "Settings/settings";
import { SetFileNameModal } from "Views/SetFileNameModal";

export class pluginUtils {
    private plugin: DrawioPlugin

    constructor(plugin: DrawioPlugin) {
        this.plugin = plugin;
    }

    getServerUrl(option: "baseurl" | "fullUrl"): string {
        const baseUrl = `http://localhost:${this.plugin.settings.port}`

        let embedmode = `${baseUrl}/?embed=1&proto=json&libraries=1&spin=1`;

        switch (this.plugin.settings.EditorTheme) {
            case "auto": {
                if (document.body.hasClass("theme-light")) embedmode = `${baseUrl}/?embed=1&proto=json&libraries=1&spin=1&ui=white`;
                if (document.body.hasClass("theme-dark")) embedmode = `${baseUrl}/?embed=1&proto=json&libraries=1&spin=1&ui=dark`;
                break;
            }

            case "light": embedmode = `${baseUrl}/?embed=1&proto=json&libraries=1&spin=1&ui=white`
                break;
            case "dark": embedmode = `${baseUrl}/?embed=1&proto=json&libraries=1&spin=1&ui=dark`;
                break;
        }

        switch (option) {
            case "baseurl": return baseUrl
            case "fullUrl": {
                return embedmode
            }

            default: return baseUrl
        }
    }

    async getFileNameForSave(): Promise<string> {
        const option: savingNameFileFormatOption = this.plugin.settings.savingNameFileFormat

        switch (option) {
            case "timestamp": {
                const folder = this.plugin.settings.folder;
                const timestamp = Date.now().toString();
                const extension = '.drawio.svg';
                const fullpath = normalizePath(`${folder}/${timestamp}${extension}`);

                if (!await this.plugin.app.vault.adapter.exists(folder)) {
                    await this.plugin.app.vault.createFolder(folder);
                }
                return fullpath;
            }

            case "uuid": {
                const folder = this.plugin.settings.folder;
                const uuid = crypto.randomUUID();
                const extension = '.drawio.svg';
                const fullpath = normalizePath(`${folder}/${uuid}${extension}`);

                if (!await this.plugin.app.vault.adapter.exists(folder)) {
                    await this.plugin.app.vault.createFolder(folder);
                }
                return fullpath;
            }

            case "iso-date-8601": {
                const folder = this.plugin.settings.folder;
                const date = new Date();

                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');

                const fulldate = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
                const extension = '.drawio.svg';
                const fullpath = normalizePath(`${folder}/${fulldate}${extension}`);

                if (!await this.plugin.app.vault.adapter.exists(folder)) {
                    await this.plugin.app.vault.createFolder(folder);
                }
                return fullpath;
            }

            case "set name": {
                const fullPath = await SetFileNameModal.openAndGetPath(
                    this.plugin.app,
                    this.plugin.settings.folder
                );

                if (fullPath) {
                    return fullPath;
                }
            }

            default: return `${Date.now().toString()}.drawio.svg`;
        }
    }

    findDiagramFileUnderCursor(app: App, editor: Editor, view: MarkdownView) {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);

        const linkRegex = /!\[\[([^|\]]+\.(?:drawio(?:\.svg)?))[^\]]*\]\]|!\[[^\]]*\]\(([^)\s]+?\.(?:drawio(?:\.svg)?))\)/g;

        let match: RegExpExecArray | null;

        while ((match = linkRegex.exec(line)) !== null) {
            const fullMatchText = match[0];

            let linkText = match[1] || match[2];
            if (!linkText) continue;

            linkText = linkText.trim().replace(/^<|>$/g, "");
            linkText = linkText.replace(/^\.?\//, "");
            try { linkText = decodeURIComponent(linkText); } catch (e) { console.log(e) }

            const startIndex = match.index;
            const endIndex = startIndex + fullMatchText.length;

            if (cursor.ch >= startIndex && cursor.ch <= endIndex) {
                const linkedFile = app.metadataCache.getFirstLinkpathDest(linkText, view.file?.path ?? "");
                if (linkedFile instanceof TFile) return linkedFile;

                const byPath = app.vault.getAbstractFileByPath(linkText);
                if (byPath instanceof TFile) return byPath;

                if (linkText.endsWith(".drawio")) {
                    const alt = linkText + ".svg";
                    const altFile = app.vault.getAbstractFileByPath(alt);
                    if (altFile instanceof TFile) return altFile;
                } else if (linkText.endsWith(".drawio.svg")) {
                    const alt = linkText.replace(/\.svg$/, "");
                    const altFile = app.vault.getAbstractFileByPath(alt);
                    if (altFile instanceof TFile) return altFile;
                }

                return null;
            }
        }

        return null;
    }

    refreshLeaves() {
        const leafTypes = ['markdown', 'canvas', "image"];

        leafTypes.forEach(type => {
            this.plugin.app.workspace.getLeavesOfType(type).forEach(async (leaf) => {
                const state = leaf.getViewState();
                const ephemeralState = leaf.getEphemeralState();

                await leaf.setViewState({ type: 'empty' });
                await leaf.setViewState(state);

                setTimeout(() => {
                    leaf.setEphemeralState(ephemeralState);
                }, 0);
            });
        });
    }

    setDiagramsTheme(mode: "editMode" | "previewMode" | "canvasMode") {

        if (mode === "previewMode") {
            switch (this.plugin.settings.diagramThemeInPreviewMode) {
                case "auto": {
                    if (document.body.hasClass("theme-light")) return "drawio-diagrams--lightTheme";
                    if (document.body.hasClass("theme-dark")) return "drawio-diagrams--darkTheme";
                };
                case "light": return "drawio-diagrams--lightTheme";
                case "dark": return "drawio-diagrams--darkTheme";
            }
        }

        if (mode === "editMode") {
            switch (this.plugin.settings.diagramThemeInEditMode) {
                case "auto": {
                    if (document.body.hasClass("theme-light")) return "drawio-diagram--editmode--lightTheme";
                    if (document.body.hasClass("theme-dark")) return "drawio-diagram--editmode--darkTheme";
                };
                case "light": return "drawio-diagram--editmode--lightTheme";
                case "dark": return "drawio-diagram--editmode--darkTheme";
            }
        }

        if (mode === "canvasMode") {
            switch (this.plugin.settings.diagramThemeInCanvas) {
                case "auto": {
                    if (document.body.hasClass("theme-light")) return "drawio-diagram--canvasMode--lightTheme";
                    if (document.body.hasClass("theme-dark")) return "drawio-diagram--canvasMode--darkTheme";
                };
                case "light": return "drawio-diagram--canvasMode--lightTheme";
                case "dark": return "drawio-diagram--canvasMode--darkTheme";
            }
        }
    }

    async copySvgAsPng(file: TFile): Promise<void> {
        try {
            let svgContent = await this.plugin.app.vault.read(file);

            svgContent = svgContent.replace(/<rect[^>]*fill\s*=\s*["'](?:#ffffff|rgb\(255,\s*255,\s*255\)|white)["'][^>]*\/>/gi, '');
            svgContent = svgContent.replace(/(style=[^>]*background-color:\s*)(?:#ffffff|white|rgb\(255,\s*255,\s*255\))/gi, '$1transparent');

            const base64Svg = btoa(unescape(encodeURIComponent(svgContent)));
            const url = `data:image/svg+xml;base64,${base64Svg}`;

            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');

                        const scaleFactor = Number(this.plugin.settings.scaleCopyDiagramAsImage);

                        const originalWidth = img.naturalWidth || 800;
                        const originalHeight = img.naturalHeight || 600;

                        canvas.width = originalWidth * scaleFactor;
                        canvas.height = originalHeight * scaleFactor;

                        img.width = canvas.width;
                        img.height = canvas.height;

                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            throw new Error('Не удалось получить контекст canvas 2d');
                        }

                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';

                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        ctx.scale(scaleFactor, scaleFactor);

                        ctx.drawImage(img, 0, 0, originalWidth, originalHeight);

                        canvas.toBlob(async (pngBlob) => {
                            if (!pngBlob) {
                                reject(new Error('Не удалось сконвертировать canvas в Blob'));
                                return;
                            }

                            try {
                                await navigator.clipboard.write([
                                    new ClipboardItem({ [pngBlob.type]: pngBlob })
                                ]);
                                new Notice(`Диаграмма скопирована в 6x качестве!`);
                                resolve();
                            } catch (clipboardError) {
                                reject(clipboardError);
                            }
                        }, 'image/png');

                    } catch (err) {
                        reject(err);
                    }
                };

                img.onerror = (err) => reject(new Error('Ошибка загрузки SVG'));
                img.src = url;
            });

        } catch (error) {
            console.error('Ошибка при экспорте диаграммы в PNG:', error);
            new Notice('Не удалось скопировать диаграмму');
        }
    }
}