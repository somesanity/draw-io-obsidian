# Changelog

All notable changes to the draw.io plugin for Obsidian will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-11-11

### Added
- Support for `.drawid` file extension - now recognized and handled like `.drawio` files
- Full support for `.drawio.svg` files with automatic detection
- Right-click context menu option "Open with draw.io" for any SVG file
- Create new diagrams directly from folder right-click menu
- Iframe caching mechanism for 10x faster diagram loading on subsequent opens
- Custom SVG file icons that adapt to the current theme
- Better file type recognition in file explorer

### Fixed
- **Critical:** Fixed `.drawio` files being incorrectly saved as SVG format
- Fixed editor title not updating when switching between diagrams
- Fixed close button not responding in the draw.io editor
- Fixed slow loading times when opening diagrams (added server polling)
- Fixed file corruption issues when saving
- Fixed temporary/pinned tab behavior to match Obsidian's native behavior
- Fixed普通 SVG files being opened by draw.io editor automatically

### Changed
- Switched `Drawioview` from `ItemView` to `FileView` for better Obsidian integration
- Improved file opening logic - now properly handles different file extensions
- Optimized server startup with health check polling instead of fixed delays
- Enhanced XML/SVG content extraction logic for more reliable file operations
- Improved error handling and user feedback with notices

### Technical
- Implemented `canAcceptExtension` for proper file type filtering
- Added `onLoadFile` and `onUnloadFile` lifecycle methods
- Improved `file-open` and `file-menu` event handlers
- Better state management for iframe initialization
- Enhanced message passing between host and iframe

## [2.0.0] - Previous Release

### Added
- Interactive diagrams with note linking
- Markdown fragment support
- External link support in diagrams
- Mermaid & LaTeX support
- 100% offline functionality with local server
- Drag and drop file support

### Changed
- Major UI/UX improvements
- Performance optimizations

## [1.0.0] - Initial Release

### Added
- Basic draw.io integration for Obsidian
- Local web server for draw.io web app
- Support for `.drawio` and `.drawio.svg` files
- Create and edit diagrams within Obsidian
- Save diagrams directly to vault
- Desktop-only support

---

## Upcoming Features

### Planned for v2.2.0
- [ ] Diagram templates
- [ ] Batch export functionality
- [ ] Improved mobile support (if feasible)
- [ ] Additional file format support
- [ ] Performance monitoring and analytics
- [ ] Auto-backup functionality

### Under Consideration
- [ ] Real-time collaboration (if possible with local server)
- [ ] Cloud storage integration
- [ ] Version history for diagrams
- [ ] Diagram search functionality
- [ ] Custom shape libraries

---

[2.1.0]: https://github.com/somesanity/draw-io-obsidian/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/somesanity/draw-io-obsidian/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/somesanity/draw-io-obsidian/releases/tag/v1.0.0

