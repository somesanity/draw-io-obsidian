import DrawioPlugin from "main";
import { ViewPlugin, EditorView, ViewUpdate } from "@codemirror/view";

export async function CenteringDiagrams(plugin: DrawioPlugin) {
    if(!plugin.settings.centeringDiagram) {
        const embeds = document.querySelectorAll<HTMLDivElement>(
        'div.internal-embed.media-embed.image-embed[src$=".drawio.svg"]'
        );

        embeds.forEach((embed) => {
          embed.classList.remove('drawio-centering-diagrams');
        })
        return
    } else {
      plugin.registerMarkdownPostProcessor((el, ctx) => {
      const embeds = el.querySelectorAll('span.internal-embed[src$=".drawio.svg"]');

      embeds.forEach((embed) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('drawio-centering-diagrams');

        if (embed.parentElement && embed.parentElement.tagName === 'DIV') return;
        embed.parentElement?.insertBefore(wrapper, embed);
        wrapper.appendChild(embed);
        });
      });
    };

const drawioDomPlugin = ViewPlugin.fromClass(class {
    constructor(view: EditorView) {
      this.applyCentering(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.viewportMoved) {
        setTimeout(() => {
      this.applyCentering(update.view);
    }, 0);
      }
    }

    applyCentering(view: EditorView) {
      const editorDom = view.dom;

      const embeds = editorDom.querySelectorAll<HTMLDivElement>(
        'div.image-embed[src$=".drawio.svg"] .image-wrapper'
      );

      embeds.forEach((embed) => {
        embed.classList.add("drawio-centering-diagrams--editmode")
      });
    }
  });
  plugin.registerEditorExtension(drawioDomPlugin);
}