import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

export const DeleteResizeBlockEditorExtension = () => {
    return ViewPlugin.fromClass(
        class {
            observer: MutationObserver;

            constructor(view: EditorView) {
                this.cleanDrawioEmbeds(view);

                this.observer = new MutationObserver(() => {
                    this.cleanDrawioEmbeds(view);
                });

                this.observer.observe(view.dom, {
                    childList: true,
                    subtree: true,
                    attributeFilter: ["src"]
                });
            }

            update(update: ViewUpdate) {
                if (update.viewportChanged) {
                    this.cleanDrawioEmbeds(update.view);
                }
            }

            destroy() {
                if (this.observer) {
                    this.observer.disconnect();
                }
            }

            cleanDrawioEmbeds(view: EditorView) {
                const embeds = view.dom.querySelectorAll(".media-embed");

                embeds.forEach((element) => {
                    const srcString = element.getAttribute("src");
                    const isDrawio = srcString?.endsWith(".drawio.svg");

                    if (isDrawio) {
                        if (!element.classList.contains("drawio-diagram--editmode")) {
                            element.classList.add("drawio-diagram--editmode");
                        }

                        const editButton = element.querySelector(".edit-block-button");
                        if (editButton) {
                            editButton.remove();
                        }

                        const resizeCorner = element.querySelector(".image-resize-corner");
                        if (resizeCorner) {
                            resizeCorner.remove();
                        }

                        const imageWrapper = element.querySelector(".image-wrapper");
                        if (imageWrapper) {
                            imageWrapper.classList.remove("image-wrapper");
                            imageWrapper.classList.add("drawio-diagram-wrapper");
                        }
                    }
                });
            }
        }
    );
};