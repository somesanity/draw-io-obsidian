import { Editor, MarkdownView, Menu, Notice, Plugin, TFile, TFolder, WorkspaceLeaf } from 'obsidian';

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
        if (file instanceof TFile) {
            if (!isDrawioFile(file)) return;

            menu.addItem((item) => {
                item
                    .setTitle(t('editDiagramContextMenu'))
                    .setIcon("pencil")
                    .onClick(async () => {
                        await this.activateView(file);
                    });
            });
            return;
        }

        if (file instanceof TFolder) {
            menu.addItem((item) => {
                item
                    .setTitle(t('CreateNewDiagramContextMenu'))
                    .setIcon('shapes')
                    .onClick(async () => {
                        await this.createDiagramInFolder(file);
                    });
            });
        }
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
    const workspace = this.app.workspace;
    const leaves = workspace.getLeavesOfType(DRAWIOVIEW);

    if (file && leaves.length > 0) {
        const existingLeaf = leaves.find((leaf) => {
            const view = leaf.view;
            return view instanceof Drawioview && view.currentFile?.path === file.path;
        });

        if (existingLeaf) {
            workspace.revealLeaf(existingLeaf);
            const existingView = existingLeaf.view;
            if (existingView instanceof Drawioview) {
                await existingView.setCurrentFile(file);
            }
            return;
        }
    }

    const targetLeaf = workspace.getLeaf(true);
    if (!targetLeaf) return;

    await launchDrawioServerLogic(this);

    await targetLeaf.setViewState({
        type: DRAWIOVIEW,
        active: true,
        state: {
            file: file?.path ?? null,
        }
    });

    workspace.revealLeaf(targetLeaf);

    const drawioView = targetLeaf.view;

    if (drawioView instanceof Drawioview && file) {
        await drawioView.setCurrentFile(file);
    }
}

private async createDiagramInFolder(folder: TFolder) {
    const folderPath = folder.path === '/' ? '' : folder.path;
    const baseName = 'diagram';
    const extension = '.drawio';

    let fileName = `${baseName}${extension}`;
    let counter = 1;
    let fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

    while (this.app.vault.getAbstractFileByPath(fullPath)) {
        fileName = `${baseName}-${counter}${extension}`;
        fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;
        counter += 1;
    }

    const emptyDiagram = "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>";

    try {
        const newFile = await this.app.vault.create(fullPath, emptyDiagram);
        new Notice(`✅ ${t('CreatedNewDiagram')} ${newFile.path}`);
        await this.activateView(newFile);
    } catch (error) {
        console.error('Failed to create diagram file', error);
        new Notice(`❌ ${t('FailedCreateNewDiagram')} ${fullPath}`);
    }
}
}