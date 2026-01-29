import { t } from 'locales/i18n';
import { App, Modal, Setting, normalizePath, ButtonComponent } from 'obsidian';

export class SetFileNameModal extends Modal {
  private fileName: string = '';
  private folderPath: string;
  private onSubmit: (result: string) => void;
  private submitBtn: ButtonComponent;
  private errorEl: HTMLElement;

  constructor(app: App, folderPath: string, onSubmit: (result: string) => void) {
    super(app);
    this.folderPath = folderPath;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    this.setTitle(t("SetNameforTheFile_TITLE"));

    const modalBg = this.containerEl.querySelector('.modal-bg');
    if (modalBg) {
        this.scope.register([], "Escape", () => false);
        modalBg.addEventListener('click', (e) => e.stopPropagation(), true);
    }

    new Setting(contentEl)
      .setName(t("SetNameforTheFile_TITLE"))
      .addText((text) =>
        text.onChange((value) => {
          this.fileName = value;
          this.validateName(value);
        }));

    this.errorEl = contentEl.createEl("div", { 
        text: t("FileNameExist"), 
        cls: "setting-item-description" 
    });
    this.errorEl.style.color = "var(--text-error)";
    this.errorEl.style.marginTop = "-10px";
    this.errorEl.style.marginBottom = "10px";
    this.errorEl.style.display = "none";

    new Setting(contentEl)
      .addButton((btn) => {
        this.submitBtn = btn;
        btn
          .setButtonText(t("SetNameforTheFile_BUTTON"))
          .setCta()
          .onClick(() => {
            if (!this.submitBtn.buttonEl.disabled) {
                this.close();
                this.onSubmit(this.fileName);
            }
          });
      });
      
      this.submitBtn.setDisabled(true); 
  }

  private validateName(name: string) {
    if (!name || name.trim() === "") {
        this.submitBtn.setDisabled(true);
        this.errorEl.style.display = "none";
        return;
    }

    const fullPath = normalizePath(`${this.folderPath}/${name}.drawio.svg`);
    
    const fileExists = this.app.vault.getAbstractFileByPath(fullPath);

    if (fileExists) {
        this.errorEl.style.display = "block";
        this.submitBtn.setDisabled(true);
    } else {
        this.errorEl.style.display = "none";
        this.submitBtn.setDisabled(false);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}