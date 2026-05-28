// links

export const DRAWIO_CLIENT_LAST_RELEASE = "https://api.github.com/repos/jgraph/drawio/releases/latest"
export const DRAWIO_CLIENT_DOWNLOADING_LINK = "https://api.github.com/repos/jgraph/drawio/zipball/dev"

// VIEWS

export const DRAWIO_EDITOR_VIEW = "drawio-editor-view"

// REGEX

export const PERCENT_SIZE_REGEX = /^(?:100(?:\.0+)?|[1-9]?\d(?:\.\d+)?)%$/;
export const EXTERNAL_LINK_CHECK = /^(https?|mailto|ftp):/i;
export const INTERNAL_LINK_CHECK = /^!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$|^!?\[[^\]]+\]\(([^)]+)\)$/;
export const CLEAR_INTERNAL_LINK = /^!?\[\[|^!?\[.*?\]\(|\]\]$|\)$|\|.*/g;
export const MARKDOWN_FRAGMENT_SEARCH = /^md-\d+$/;