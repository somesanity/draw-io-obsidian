export const DRAWIOVIEW = 'drawioview';

// Supported draw.io file extensions
export const DRAWIO_EXTENSIONS = {
	SVG: '.drawio.svg',
	XML: '.drawio',
	DRAWID: '.drawid'
} as const;

// All supported extensions as array
export const DRAWIO_EXTENSIONS_LIST = [
	DRAWIO_EXTENSIONS.SVG,
	DRAWIO_EXTENSIONS.XML,
	DRAWIO_EXTENSIONS.DRAWID
] as const;

// Regex pattern for matching draw.io file links
export const DRAWIO_FILE_PATTERN = `\\.(?:drawio(?:\\.svg)?|drawid)`;