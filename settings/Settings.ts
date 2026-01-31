export interface DrawioSettings {
  port: string;
  centeringDiagram: boolean;
  percentSize: boolean;
  interactiveDiagram: boolean;
  useMarkdownLinks: boolean;
  Folder: string;
  diagramSize: string;
  HoverSizeDiagram: string;
  HiddenBorderInCanvas: boolean;
  HiddenLabelInCanvas: boolean;
  AlwaysFocusedInCanvas: boolean;
  HiddenBorderInFocusMode: boolean;
  TransparentDiagramBackgroundInCanavas: boolean;
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
  HiddenBorderInCanvas: true,
  HiddenLabelInCanvas: true,
  HiddenBorderInFocusMode: true,
  AlwaysFocusedInCanvas: true,
  TransparentDiagramBackgroundInCanavas: true,
};