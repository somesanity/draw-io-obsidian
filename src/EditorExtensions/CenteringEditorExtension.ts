import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

export const CenteringEditorExtension = () => {
    return ViewPlugin.fromClass(
        class {
            observer: MutationObserver;
            view: EditorView;

            constructor(view: EditorView) {
                this.view = view;

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

                const addedClasses = this.view.dom.querySelectorAll(".drawio-centering-diagrams--editmode");
                addedClasses.forEach((element) => {
                    element.classList.remove("drawio-centering-diagrams--editmode");
                });
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