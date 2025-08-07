import { Editor, MarkdownEditView, MarkdownView, Menu, Notice, Plugin, TFile, WorkspaceLeaf } from 'obsidian';

import { DRAWIOVIEW } from 'consts';
import { Drawioview } from 'views/drawioView';
import { setLocale, t } from 'locales/i18n';
import { Server } from 'node:http';
import { launchDrawioServerLogic } from 'handlers/ServerStart';
import { DrawioSettings, DEFAULT_SETTINGS } from 'settings/Settings';
import { DrawioTab } from 'settings/Settings-tab';
import { CenteringDiagrams } from 'utils/centeringDiagrams';
import { DefaultDiagramSize } from 'utils/DefaultDiagramSize';
import { InteractiveDiagrams } from 'utils/interactiveDiagrams';
import { findDiagramFileUnderCursor } from 'handlers/findDiagramFileUnderCursor';
import { DrawioEmbedModal } from 'views/modalDrawio';

export default class DrawioPlugin extends Plugin {

isServerOpen: Server | null = null;
settings: DrawioSettings;

  async onload() {

	await this.loadSettings();
	this.addSettingTab(new DrawioTab(this.app, this));

	this.registerView(
		DRAWIOVIEW,
		(leaf) => new Drawioview(leaf, this) 
	)
	
	const userLang = (window.localStorage.getItem('language') || 'en').split('-')[0];
	setLocale(userLang);

	this.addRibbonIcon('dice', t("ribonIconTitle"), async () => {
		this.activateView()
		await launchDrawioServerLogic(this)
	}) 

	await CenteringDiagrams(this)
	await DefaultDiagramSize(this)
	await InteractiveDiagrams(this, this.app)

	this.registerEvent(
		this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
			const fileToEdit = findDiagramFileUnderCursor(this.app, editor, view);
			const openDrawioModal = async (file?: TFile) => {
                await launchDrawioServerLogic(this); 
                new DrawioEmbedModal(this.app, editor, this, file).open();
            };

			if(fileToEdit) {
				menu.addItem((item) => {
					item
						.setTitle(`Edit ${fileToEdit.basename}`)
                        .setIcon("pencil")
                        .setSection("drawio-actions")
                        .onClick(() => openDrawioModal(fileToEdit));
				})
			} else {
				menu.addItem((item) => {
                    item
                        .setTitle("Embed New Draw.io Diagram")
                        .setIcon("shapes")
                        .setSection("drawio-actions")
                        .onClick(() => openDrawioModal());
                    });
			}
		})
	)

        this.addCommand({
            id: 'drawio-create-or-edit',
            name: 'Create or edit Draw.io diagram',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const fileToEdit = findDiagramFileUnderCursor(this.app, editor, view); 
                await launchDrawioServerLogic(this); 

                if (fileToEdit) {
                    new DrawioEmbedModal(this.app, editor, this, fileToEdit).open();
                } else {
                    new DrawioEmbedModal(this.app, editor, this).open();
                }
            }
        });
  }


async loadSettings() {
	this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

async saveSettings() {
	await this.saveData(this.settings);
}

  async onunload() {
	  if (this.isServerOpen) {
        this.isServerOpen.close(() => {
          new Notice(t("StopDrawioClinetServer"));
          this.isServerOpen = null;
        });
    }

    const ExternalLinkTooltip = document.querySelector('.drawio-custom-tooltip');
    if (ExternalLinkTooltip) {
      ExternalLinkTooltip.remove();
    }

    const Markdowntooltips = document.querySelectorAll('.drawio-markdown-tooltip');

    if(Markdowntooltips) {
      Markdowntooltips.forEach(markdowntooltip => {
        console.log('удалён')
        markdowntooltip.remove();
      });
    }

  }

  async activateView() {
	const leaf = this.app.workspace.getLeaf(false);
	if(leaf) {
		await leaf.setViewState({
		type: DRAWIOVIEW,
		active: true,
    });
    this.app.workspace.revealLeaf(leaf);
	}
  }
}