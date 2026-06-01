import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import DrawioPlugin from "main";
import { pluginUtils } from "Utils/PluginUtils";

export const setDiagramThemeEditorExtension = (plugin: DrawioPlugin) => {
    const utils = new pluginUtils(plugin);

    return ViewPlugin.fromClass(
        class {
            observer: MutationObserver;
            view: EditorView;

            constructor(view: EditorView) {
                this.view = view;

                this.setTheme(view);
                this.observer = new MutationObserver(() => {
                    this.setTheme(view);
                });

                this.observer.observe(view.dom, {
                    childList: true,
                    subtree: true,
                    attributeFilter: ["src"]
                });
            }

            update(update: ViewUpdate) {
                if (update.viewportChanged) {
                    this.setTheme(update.view);
                }
            }

            destroy() {
                if (this.observer) {
                    this.observer.disconnect();
                }

                const addedClasses = this.view.dom.querySelectorAll("img[class*='drawio-diagram--editmode--']");

                addedClasses.forEach((element) => {
                    element.classList.remove("drawio-diagram--editmode--lightTheme", "drawio-diagram--editmode--darkTheme");
                });
            }

            setTheme(view: EditorView) {
                const embeds = view.dom.querySelectorAll(".media-embed");

                embeds.forEach((element) => {
                    const srcString = element.getAttribute("src");
                    const isDrawio = srcString?.endsWith(".drawio.svg");

                    if (isDrawio) {
                        const diagram = element.querySelector("img");

                        if (diagram) {
                            diagram.classList.add(`${utils.setDiagramsTheme("editMode")}`);
                        }
                    }
                });
            }
        }
    );
};