export interface DrawioPluginSettings {
    port: number;
    diagramsFolder: string;
}

export const DEFAULT_SETTINGS: DrawioPluginSettings = {
    port: 1717, 
    diagramsFolder: 'DrawIo'
}
