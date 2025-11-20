import { t } from 'locales/i18n';
import { App, Modal, Setting } from 'obsidian';

export class SetFileNameModal extends Modal {
  private fileName: string;

  constructor(app: App, onSubmit: (result: string) => void) {
    super(app);
    this.setTitle(t("SetNameforTheFile_TITLE"));
      const modalBg = this.containerEl.querySelector('.modal-bg');
      if (modalBg) {
          this.scope.register([], "Escape", () => false);
          modalBg.addEventListener('click', (e) => e.stopPropagation(), true);
      }
    let FileName = this.fileName;
      new Setting(this.contentEl)
        .setName(t("SetNameforTheFile_TITLE"))
        .addText((text) =>
          text.onChange((value) => {
            FileName = value;
          }));

      new Setting(this.contentEl)
        .addButton((btn) =>
          btn
            .setButtonText(t("SetNameforTheFile_BUTTON"))
            .setCta()
            .onClick(() => {
              this.close();
              onSubmit(FileName);
          }));
  }
}