import { App, Modal, Setting, normalizePath, ButtonComponent } from 'obsidian';

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

        this.setTitle("Задать имя файла");

        const modalBg = this.containerEl.querySelector('.modal-bg');
        if (modalBg) {
            this.scope.register([], "Escape", () => false);
            modalBg.addEventListener('click', (e) => e.stopPropagation(), true);
        }

        new Setting(contentEl)
            .setName("Имя файла")
            .setDesc("Введите название для вашего drawio диаграммы")
            .addText((text) =>
                text.onChange((value) => {
                    this.fileName = value.trim();
                    this.validateName(this.fileName);
                }));

        this.errorEl = contentEl.createEl("div", {
            text: "Файл с таким именем уже существует!",
            cls: "setting-item-description Drawio-set-file-name-error"
        });

        new Setting(contentEl)
            .addButton((btn) => {
                this.submitBtn = btn;
                btn
                    .setButtonText("Задать имя")
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
        if (!this.isSubmitted) {
            this.onSubmit(null);
        }
        this.contentEl.empty();
    }
}