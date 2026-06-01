import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

export const SetClassToDiagramsEditorExtension = () => {
    return ViewPlugin.fromClass(
        class {
            observer: MutationObserver;
            view: EditorView;

            constructor(view: EditorView) {
                this.view = view;

                this.addDrawioClass(view);
                this.observer = new MutationObserver(() => {
                    this.addDrawioClass(view);
                });

                this.observer.observe(view.dom, {
                    childList: true,
                    subtree: true,
                    attributeFilter: ["src"]
                });
            }

            update(update: ViewUpdate) {
                if (update.viewportChanged) {
                    this.addDrawioClass(update.view);
                }
            }

            destroy() {
                if (this.observer) {
                    this.observer.disconnect();
                }

                const addedClasses = this.view.dom.querySelectorAll("img.drawio-diagram--editmode");
                addedClasses.forEach((element) => {
                    element.classList.remove("drawio-diagram--editmode");
                });
            }

            addDrawioClass(view: EditorView) {
                const embeds = view.dom.querySelectorAll(".media-embed");

                embeds.forEach((element) => {
                    const srcString = element.getAttribute("src");
                    const isDrawio = srcString?.endsWith(".drawio.svg");

                    if (isDrawio) {
                        const diagram = element.querySelector("img");

                        if (diagram) {
                            diagram.classList.add("drawio-diagram--editmode");
                        }
                    }
                });
            }
        }
    );
};