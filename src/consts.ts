// links

export const DRAWIO_CLIENT_LAST_RELEASE = "https://api.github.com/repos/jgraph/drawio/releases/latest"
export const DRAWIO_CLIENT_DOWNLOADING_LINK = "https://api.github.com/repos/jgraph/drawio/zipball/dev"

// VIEWS

export const DRAWIO_EDITOR_VIEW = "drawio-editor-view"
export const DRAWIO_EDITOR_VIEW_FILE_ITEM_TYPE = "drawio-editor-view-file-item"

// FILE FORMATS

export const DRAWIO_XML_SUFFIX = ".drawio"
export const DRAWIO_SVG_SUFFIX = ".drawio.svg"

// SIDECAR PREVIEWS

export const SIDECAR_RENDER_TIMEOUT = 60000
export const SIDECAR_EXPORT_RETRY_DELAY = 15000
export const SIDECAR_LOAD_FALLBACK_DELAY = 3000

// REGEX

export const PERCENT_SIZE_REGEX = /^(?:100(?:\.0+)?|[1-9]?\d(?:\.\d+)?)%$/;
export const PIXEL_SIZE_REGEX = /^\d+$/;
export const EXTERNAL_LINK_CHECK = /^(https?|mailto|ftp):/i;
export const INTERNAL_LINK_CHECK = /^!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$|^!?\[[^\]]+\]\(([^)]+)\)$/;
export const CLEAR_INTERNAL_LINK = /^!?\[\[|^!?\[.*?\]\(|\]\]$|\)$|\|.*/g;
export const MARKDOWN_FRAGMENT_SEARCH = /^md-\d+$/;
export const DRAWIO_EXTENSION = /\.drawio(\.svg)?$/