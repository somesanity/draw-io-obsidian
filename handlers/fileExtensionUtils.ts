import { TFile } from 'obsidian';
import { DRAWIO_EXTENSIONS } from 'consts';

/**
 * Check if a file is a draw.io diagram file
 */
export function isDrawioFile(file: TFile | null): boolean {
	if (!file) return false;
	return file.name.endsWith(DRAWIO_EXTENSIONS.SVG) ||
		   file.name.endsWith(DRAWIO_EXTENSIONS.XML) ||
		   file.name.endsWith(DRAWIO_EXTENSIONS.DRAWID);
}

/**
 * Check if a file is in XML format (not SVG)
 */
export function isXmlFormat(file: TFile | null): boolean {
	if (!file) return false;
	return file.name.endsWith(DRAWIO_EXTENSIONS.XML) ||
		   file.name.endsWith(DRAWIO_EXTENSIONS.DRAWID);
}

/**
 * Check if a file is in SVG format
 */
export function isSvgFormat(file: TFile | null): boolean {
	if (!file) return false;
	return file.name.endsWith(DRAWIO_EXTENSIONS.SVG);
}

