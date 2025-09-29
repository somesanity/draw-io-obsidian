import { Editor, MarkdownView, Menu, Notice, Plugin, TFile } from 'obsidian';

import { DRAWIOVIEW } from 'consts';
import { Drawioview } from 'views/drawioView';
import { setLocale, t } from 'locales/i18n';
import { Server } from 'node:http';
import { launchDrawioServerLogic } from 'utils/ServerStart';
import { DrawioSettings, DEFAULT_SETTINGS } from 'settings/Settings';
import { DrawioTab } from 'settings/Settings-tab';
import { CenteringDiagrams } from 'postProcessing/centeringDiagrams';
import { DefaultDiagramSize } from 'postProcessing/DefaultDiagramSize';
import { InteractiveDiagrams } from 'postProcessing/interactiveDiagrams';
import { findDiagramFileUnderCursor } from 'handlers/findDiagramFileUnderCursor';
import { DrawioEmbedModal } from 'views/modalDrawio';
import { DrawioClientManager } from 'utils/drawioClientManager';

export default class DrawioPlugin extends Plugin {

isServerOpen: Server | null = null;
settings: DrawioSettings;
private drawioclientwebappManager: DrawioClientManager;

  async onload() {
  this.drawioclientwebappManager = new DrawioClientManager(this.app, this.manifest);
  await this.drawioclientwebappManager.checkAndUnzipDrawioClient();

	await this.loadSettings();
	this.addSettingTab(new DrawioTab(this.app, this));

	this.registerView(
		DRAWIOVIEW,
		(leaf) => new Drawioview(leaf, this) 
	)
	
	const userLang = (window.localStorage.getItem('language') || 'en').split('-')[0];
	setLocale(userLang);

	this.addRibbonIcon('shapes', t("ribonIconTitle"), async () => {
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
        new DrawioEmbedModal(this.app, this, file, editor).open();
    };
			if(!fileToEdit) {
				menu.addItem((item) => {
          item
              .setTitle(t('CreateNewDiagramContextMenu'))
              .setIcon("shapes")
              .setSection("drawio-actions")
              .onClick(() => openDrawioModal());
        });
			}
		})
	)

  this.registerEvent(
    this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile)) return;

        if (!file.name.endsWith(".drawio.svg")) return;

        menu.addItem((item) => {
            item
                .setTitle(t('editDiagramContextMenu'))
                .setIcon("pencil")
                .onClick(async () => {
                    await launchDrawioServerLogic(this);

                    new DrawioEmbedModal(this.app, this, file, undefined).open();
                });
        });
    })
);

      this.addCommand({
            id: 'drawio-create-or-edit',
            name: t('CreateAndEditNewDiagram'),
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const fileToEdit = findDiagramFileUnderCursor(this.app, editor, view); 
                await launchDrawioServerLogic(this); 

                if (fileToEdit) {
                    new DrawioEmbedModal(this.app, this, fileToEdit, editor).open();
                } else {
                    new DrawioEmbedModal(this.app, this, null, editor).open();
                }
            }
        });

        this.addCommand({
            id: 'open-drawio-editor',
            name: t('ribonIconTitle'),
            editorCallback: async () => {
              this.activateView()
		          await launchDrawioServerLogic(this)
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

    const ExternalLinkTooltip = document.querySelector('.drawio-external-tooltip');
    if (ExternalLinkTooltip) {
      ExternalLinkTooltip.remove();
    }

    const Markdowntooltips = document.querySelectorAll('.drawio-markdown-tooltip');

    if(Markdowntooltips) {
      Markdowntooltips.forEach(markdowntooltip => {
        markdowntooltip.remove();
      });
    }
  }

  async activateView() {
	const leaf = this.app.workspace.getLeaf(true);
	if(leaf) {
		await leaf.setViewState({
		type: DRAWIOVIEW,
		active: true,
    });
    this.app.workspace.revealLeaf(leaf);
	}
  }
}