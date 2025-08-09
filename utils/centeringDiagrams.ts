import DrawioPlugin from "main";

export async function CenteringDiagrams(plugin: DrawioPlugin) {
    if(!plugin.settings.centeringDiagram) {
        return
    } else {
  plugin.registerMarkdownPostProcessor((el, ctx) => {
  const embeds = el.querySelectorAll('span.internal-embed[src$=".drawio.svg"]');

  embeds.forEach((embed) => {
    const wrapper = document.createElement('div');
    wrapper.style.textAlign = 'center';
    wrapper.style.width = '100%';

    const img = embed.querySelector('img');
    if (img) {
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.maxWidth = '100%';
    }

    if (embed.parentElement && embed.parentElement.tagName === 'DIV') return;
    embed.parentElement?.insertBefore(wrapper, embed);
    wrapper.appendChild(embed);
  });
});

    };
}