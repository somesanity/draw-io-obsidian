import DrawioPlugin from "main";
import { ViewPlugin, EditorView } from "@codemirror/view";
import { wrap } from "node:module";

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

            const embeds = editorDom.querySelectorAll('.internal-embed.media-embed.image-embed.is-loaded[src$=".drawio.svg"]');
            const wrappers = document.querySelectorAll<HTMLDivElement>(
            'div.image-embed[src$=".drawio.svg"] .image-wrapper'
            );
            const percentpattern = /^(100|[1-9]?\d)%$/;
            for (const embed of Array.from(embeds)) {
                embed.style.width = "100%"
                const img = embed.querySelector("img");
                const width = img?.getAttribute('alt')
                if(percentpattern.test(width ?? '')) {
                    img?.setAttribute('width', width!)
                }

                if(!img?.hasAttribute("width")) {
                    img.style.width = 'auto'
                } else {
                    img.style.width = width!
                }
            }

                for (const wrapper of Array.from(wrappers)) {
                    wrapper.style.width = "100%"
            }
    }});
        plugin.registerEditorExtension(percentSize);
    }}