import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

export const CenteringEditorExtension = () => {
    return ViewPlugin.fromClass(
        class {
            observer: MutationObserver;

            constructor(view: EditorView) {
                this.applyCentering(view);

                this.observer = new MutationObserver(() => {
                    this.applyCentering(view);
                });

                this.observer.observe(view.dom, {
                    childList: true,
                    subtree: true,
                    attributeFilter: ["src"]
                });
            }

            update(update: ViewUpdate) {
                if (update.viewportChanged) {
                    this.applyCentering(update.view);
                }
            }

            destroy() {
                if (this.observer) {
                    this.observer.disconnect();
                }
            }

            applyCentering(view: EditorView) {
                const embeds = view.dom.querySelectorAll(".media-embed");

                embeds.forEach((element) => {
                    const srcString = element.getAttribute("src");
                    const isDrawio = srcString?.endsWith(".drawio.svg");

                    if (isDrawio && !element.classList.contains("drawio-centering-diagrams--editmode")) {
                        element.classList.add("drawio-centering-diagrams--editmode");
                    }
                });
            }
        }
    );
};