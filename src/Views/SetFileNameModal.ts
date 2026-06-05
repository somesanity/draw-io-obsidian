import { App, Modal, Setting, normalizePath, ButtonComponent } from 'obsidian';
import { t } from "locales/I18n";

export class SetFileNameModal extends Modal {
    private fileName: string = '';
    private folderPath: string;
    private onSubmit: (result: string | null) => void;
    private submitBtn!: ButtonComponent;
    private errorEl!: HTMLElement;
    private isSubmitted: boolean = false;

    static openAndGetPath(app: App, folderPath: string): Promise<string | null> {
        return new Promise((resolve) => {
            const modal = new SetFileNameModal(app, folderPath, (result) => {
                resolve(result);
            });
            modal.open();
        });
    }

    private constructor(app: App, folderPath: string, onSubmit: (result: string | null) => void) {
        super(app);
        this.folderPath = folderPath;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        this.setTitle(t("DRAWIO_MODAL__TITLE"));

        const modalBg = this.containerEl.querySelector('.modal-bg');
        if (modalBg) {
            this.scope.register([], "Escape", () => false);
            modalBg.addEventListener('click', (e) => e.stopPropagation(), true);
        }

        new Setting(contentEl)
            .setName(t("DRAWIO_MODAL__NAME_FIELD"))
            .setDesc(t("DRAWIO_MODAL__DESC_FIELD"))
            .addText((text) =>
                text.onChange((value) => {
                    this.fileName = value.trim();
                    this.validateName(this.fileName);
                }));

        this.errorEl = contentEl.createEl("div", {
            text: t("DRAWIO_MODAL__ERROR_EXISTS"),
            cls: "setting-item-description Drawio-set-file-name-error"
        });

        new Setting(contentEl)
            .addButton((btn) => {
                this.submitBtn = btn;
                btn
                    .setButtonText(t("DRAWIO_MODAL__SUBMIT_BTN"))
                    .setCta()
                    .onClick(() => {
                        if (!this.submitBtn.buttonEl.disabled) {
                            this.isSubmitted = true;
                            this.close();

                            const fullPath = normalizePath(`${this.folderPath}/${this.fileName}.drawio.svg`);
                            this.onSubmit(fullPath);
                        }
                    });
            });

        this.submitBtn.setDisabled(true);
    }

    private validateName(name: string) {
        if (!name || name === "") {
            this.submitBtn.setDisabled(true);
            this.errorEl.addClass("modal-setfilename-errorValidateText--visible");
            this.errorEl.removeClass("modal-setfilename-errorValidateText--invisible");
            return;
        }

        const fullPath = normalizePath(`${this.folderPath}/${name}.drawio.svg`);
        const fileExists = this.app.vault.getAbstractFileByPath(fullPath);

        if (fileExists) {
            this.errorEl.addClass("modal-setfilename-errorValidateText--visible");
            this.errorEl.removeClass("modal-setfilename-errorValidateText--invisible");
            this.submitBtn.setDisabled(true);
        } else {
            this.errorEl.removeClass("modal-setfilename-errorValidateText--visible");
            this.errorEl.addClass("modal-setfilename-errorValidateText--invisible");
            this.submitBtn.setDisabled(false);
        }
    }

    onClose() {
        if (!this.isSubmitted) {
            this.onSubmit(null);
        }
        this.contentEl.empty();
    }
}