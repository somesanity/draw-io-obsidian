export interface DrawioSettings {
  port: string;
  centeringDiagram: boolean;
  percentSize: boolean;
  interactiveDiagram: boolean;
  useMarkdownLinks: boolean;
  Folder: string;
  diagramSize: string;
  HoverSizeDiagram: string;
}

export const DEFAULT_SETTINGS: Partial<DrawioSettings> = {
  port: '1717',
  centeringDiagram: true,
  percentSize: true,
  interactiveDiagram: true,
  useMarkdownLinks: false,
  Folder: 'drawio',
  diagramSize: '',
  HoverSizeDiagram: '100%',
};