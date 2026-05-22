import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { PERCENT_SIZE_REGEX } from "consts";

export const PercentSizeEditorExtension = () => {
    return ViewPlugin.fromClass(
        class {
            observer: MutationObserver;

            constructor(view: EditorView) {
                this.applyPercentSizes(view);

                this.observer = new MutationObserver(() => {
                    this.applyPercentSizes(view);
                });

                this.observer.observe(view.dom, {
                    childList: true,
                    subtree: true,
                    attributeFilter: ["src", "alt"]
                });
            }

            update(update: ViewUpdate) {
                if (update.viewportChanged) {
                    this.applyPercentSizes(update.view);
                }
            }

            destroy() {
                if (this.observer) {
                    this.observer.disconnect();
                }
            }

            applyPercentSizes(view: EditorView) {
                const embeds = view.dom.querySelectorAll(".media-embed");

                embeds.forEach((element) => {
                    const srcString = element.getAttribute("src");
                    const isDrawio = srcString?.endsWith(".drawio.svg");

                    if (isDrawio) {
                        const altString = element.getAttribute("alt") || element.querySelector("img")?.getAttribute("alt");

                        if (altString && PERCENT_SIZE_REGEX.test(altString)) {
                            const img = element.querySelector("img");
                            if (img) {
                                img.setAttribute("width", altString);
                            }
                        }
                    }
                });
            }
        }
    );
};