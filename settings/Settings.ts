import { TFolder } from "obsidian";

export interface DrawioSettings {
  port: string;
  centeringDiagram: boolean;
  percentSize: boolean;
  interactiveDiagram: boolean;
  Folder: string;
  diagramSize: string;
}

export const DEFAULT_SETTINGS: Partial<DrawioSettings> = {
  port: '1717',
  centeringDiagram: true,
  percentSize: true,
  interactiveDiagram: true,
  Folder: 'drawio',
  diagramSize: '',
};