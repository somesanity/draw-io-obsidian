import { Editor, MarkdownView, Menu, Notice, Plugin, TFile } from 'obsidian';

import { DRAWIOVIEW } from 'consts';
import { Drawioview } from 'views/drawioView';
import { setLocale, t } from 'locales/i18n';
import { Server } from 'node:http';
import { launchDrawioServerLogic } from 'utils/ServerStart';
import { DrawioSettings, DEFAULT_SETTINGS } from 'settings/Settings';
import { DrawioTab } from 'settings/Settings-tab';
import { CenteringDiagrams } from 'postProcessing/centeringDiagrams';
import { PercentSize } from 'postProcessing/PercentSize';
import { InteractiveDiagrams } from 'postProcessing/interactiveDiagrams';
import { findDiagramFileUnderCursor } from 'handlers/findDiagramFileUnderCursor';
import { DrawioEmbedModal } from 'views/modalDrawio';
import { DrawioClientManager } from 'utils/drawioClientManager';
import { isDrawioFile } from 'handlers/fileExtensionUtils';

export default class DrawioPlugin extends Plugin {

isServerOpen: Server | null = null;
settings: DrawioSettings;
private drawioclientwebappManager: DrawioClientManager;

  async onload() {
  this.drawioclientwebappManager = new DrawioClientManager(this.app, this.manifest);
  await this.drawioclientwebappManager.checkAndUnzipDrawioClient();

	await this.loadSettings();
	this.addSettingTab(new DrawioTab(this.app, this));

	// Register draw.io file extensions with the custom view
	this.registerExtensions(['drawid', 'drawio', 'drawio.svg'], DRAWIOVIEW);

	this.registerView(
		DRAWIOVIEW,
		(leaf) => new Drawioview(leaf, this) 
	)
	
	const userLang = (window.localStorage.getItem('language') || 'en').split('-')[0];
	setLocale(userLang);

	this.addRibbonIcon('shapes', t("ribonIconTitle"), async () => {
		await this.activateView()
	})

	this.registerEvent(
		this.app.workspace.on('file-open', async (file) => {
			if (file && isDrawioFile(file)) {
				await launchDrawioServerLogic(this);
			}
		})
	)

	await CenteringDiagrams(this)
	await PercentSize(this)
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

        if (!isDrawioFile(file)) return;

        menu.addItem((item) => {
            item
                .setTitle(t('editDiagramContextMenu'))
                .setIcon("pencil")
                .onClick(async () => {
                    await this.activateView(file);
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
            editorCallback: async (editor: Editor, view: MarkdownView) => {
              const fileToEdit = findDiagramFileUnderCursor(this.app, editor, view);

              if(fileToEdit) {
                await this.activateView(fileToEdit);
              } else {
                await this.activateView();
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

async activateView(file?: TFile) {
    const leaf = this.app.workspace.getLeaf(true);
    if (!leaf) return;

    await launchDrawioServerLogic(this);

    await leaf.setViewState({
        type: DRAWIOVIEW,
        active: true,
        state: {
            file: file?.path ?? null,
        }
    });

    this.app.workspace.revealLeaf(leaf);

    const drawioView = leaf.view;

    if (drawioView instanceof Drawioview && file) {
        await drawioView.setCurrentFile(file);
    }
}
}