import { ItemView, WorkspaceLeaf } from 'obsidian';

import { DRAWIOVIEW } from 'consts';
import { t } from 'locales/i18n';

export class Drawioview extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return DRAWIOVIEW;
  }

  getDisplayText() {
    return t("DrawIoViewName");
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl('iframe', {attr: {src: 'http://localhost:3000'}}).addClass('drawioIframe')
  }

  async onClose() {
    // Nothing to clean up.
  }
}