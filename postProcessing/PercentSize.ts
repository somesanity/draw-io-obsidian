import DrawioPlugin from "main";
import { ViewPlugin, EditorView } from "@codemirror/view";

export async function PercentSize(plugin: DrawioPlugin) {
    if(!plugin.settings.percentSize) {
        const embeds = document.body.querySelectorAll('span.internal-embed[src$=".drawio.svg"]');
        embeds.forEach(embed => {
            embed.removeAttribute('width');
        });

        const editembeds = document.body.querySelectorAll('div.internal-embed.media-embed.image-embed[src$=".drawio.svg"]')
        for (const embed of Array.from(editembeds)) {
            const img = embed.querySelector("img");
            if(img?.hasAttribute('width')) {
                img?.removeAttribute('width')
            }
        }

        return;
    } else {
        plugin.registerMarkdownPostProcessor((el, ctx) => {
            const embeds = el.querySelectorAll('span.internal-embed[src$=".drawio.svg"]');
            embeds.forEach((embed) => {
                const width = embed.getAttribute('alt')

                const percentpattern = /^(100|[1-9]?\d)%$/;

                if(percentpattern.test(width ?? '')) {
                    embed.setAttribute('width', width!)
                }
            })
        })

    const percentSize = ViewPlugin.fromClass(class {
    constructor(view: EditorView) {
      this.applyCentering(view);
    }

    update(update: any) {
      if (update.docChanged || update.viewportChanged) {
        this.applyCentering(update.view);
      }
    }

    applyCentering(view: EditorView) {
      const editorDom = view.dom;

            const embeds = editorDom.querySelectorAll('div.internal-embed.media-embed.image-embed[src$=".drawio.svg"]');
            const percentpattern = /^(100|[1-9]?\d)%$/;
            for (const embed of Array.from(embeds)) {
                const img = embed.querySelector("img");
                const width = img?.getAttribute('alt')
                if(percentpattern.test(width ?? '')) {
                    img?.setAttribute('width', width!)
                }
            }
    }});
        plugin.registerEditorExtension(percentSize);
    }}