export interface DrawioPluginSettings {
    port: number;
    diagramsFolder: string;
}

export const DEFAULT_SETTINGS: DrawioPluginSettings = {
    port: 8080, 
    diagramsFolder: 'DrawIo'
}
