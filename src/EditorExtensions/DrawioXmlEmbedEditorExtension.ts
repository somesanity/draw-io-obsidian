import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import DrawioPlugin from "main";
import { processDrawioXmlEmbeds } from "Utils/DrawioXmlEmbeds";

export const DrawioXmlEmbedEditorExtension = (plugin: DrawioPlugin) => {
    return ViewPlugin.fromClass(
        class {
            private observer: MutationObserver;
            private view: EditorView;

            constructor(view: EditorView) {
                this.view = view;
                this.process(view);

                this.observer = new MutationObserver(() => this.process(view));
                this.observer.observe(view.dom, {
                    childList: true,
                    subtree: true,
                    attributeFilter: ["src", "alt"]
                });
            }

            update(update: ViewUpdate) {
                if (update.viewportChanged || update.docChanged) {
                    this.process(update.view);
                }
            }

            destroy() {
                this.observer.disconnect();
            }

            private process(view: EditorView) {
                const sourcePath = plugin.app.workspace.getActiveFile()?.path || "";
                processDrawioXmlEmbeds(plugin, view.dom, sourcePath, "editMode");
            }
        }
    );
};
