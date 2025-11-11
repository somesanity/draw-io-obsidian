# 🎉 draw.io for Obsidian v2.1.0

We're excited to announce version 2.1.0 of the draw.io plugin for Obsidian!

## ✨ What's New

### 🆕 Major Features

#### 1. Extended File Format Support
- **`.drawid` files** - Full support for this draw.io format
- **`.drawio.svg` files** - Automatic detection and handling
- **Any SVG files** - Right-click to open with draw.io

#### 2. Lightning Fast Performance ⚡
- **Iframe Caching** - Diagrams now load up to 10x faster on subsequent opens
- **Optimized Server Startup** - Smart polling reduces initial loading time
- No more waiting between diagram switches!

#### 3. Better Integration with Obsidian
- **Native Tab Behavior** - Temporary and pinned tabs work correctly
- **Context Menu** - Create diagrams from folder right-click
- **Smart File Handling** - Proper file type detection and routing

### 🐛 Critical Fixes

- ✅ **Fixed file corruption** - `.drawio` files no longer saved as SVG
- ✅ **Editor title updates** - File name displays correctly in tabs
- ✅ **Close button works** - No more unresponsive editor
- ✅ **Save works reliably** - Direct file saving with proper format

### 🎨 UI/UX Improvements

- **New File Icons** - Clean, theme-aware icons in file explorer
- **Right-Click Menus** - Intuitive options for all file types
- **Better Feedback** - Clear notifications for all operations

## 📸 Screenshots

### New Features in Action

**Create from Folder**
```
Right-click any folder → "Create new diagram" → Instant .drawio file
```

**Open Any SVG**
```
Right-click any .svg file → "Open with draw.io" → Edit immediately
```

**Fast Switching**
```
Open diagram → Close → Reopen → Instant load! ⚡
```

## 🚀 Usage Examples

### Working with Different File Types

```markdown
## Supported Formats

1. `.drawio` - Native draw.io XML format
2. `.drawid` - Alternative draw.io format (NEW!)
3. `.drawio.svg` - SVG with embedded draw.io data
4. `.svg` - Any SVG via right-click menu
```

### Creating Diagrams

```markdown
**Method 1:** Click the ribbon icon (shapes)
**Method 2:** Command palette → "Create new diagram"
**Method 3:** Right-click folder → "Create new diagram"
**Method 4:** Right-click in editor → "Create new diagram"
```

## 🔧 Technical Details

### Performance Improvements
- Iframe reuse across file opens
- Server health check polling (150ms intervals)
- Lazy initialization for non-critical components

### Architecture Changes
- Migrated from `ItemView` to `FileView`
- Enhanced lifecycle management (`onLoadFile`, `onUnloadFile`)
- Better state synchronization

### Compatibility
- Minimum Obsidian version: 0.15.0
- Desktop only (Windows, macOS, Linux)
- Node.js not required for end users

## 📦 Installation

### Via BRAT (Recommended)
1. Install BRAT plugin
2. Add beta plugin: `https://github.com/somesanity/draw-io-obsidian`
3. Select version 2.1.0

### Manual Installation
1. Download latest release from GitHub
2. Extract to `.obsidian/plugins/draw-io/`
3. Enable in Obsidian settings

## 🙏 Acknowledgments

Thanks to all users who reported issues and provided feedback!

Special thanks to:
- The draw.io team for the amazing diagramming tool
- The Obsidian community for testing and suggestions
- Contributors who helped improve the codebase

## 🐛 Known Issues

- First load may still take a few seconds (server startup)
- Very large diagrams (>10MB) may have slight delay
- Mobile support not yet available

## 📝 Upgrade Notes

### From v2.0.x
- No breaking changes
- Existing diagrams work without modification
- New features available immediately

### Migration
- All `.drawio` and `.drawio.svg` files remain compatible
- Consider converting large diagrams to `.drawid` for better performance

## 🔮 What's Next?

### Planned for v2.2.0
- Diagram templates
- Batch operations
- Export to multiple formats
- Performance analytics

### Under Consideration
- Real-time collaboration
- Version history
- Custom shape libraries
- Diagram search

## 📞 Support & Feedback

- **Issues:** [GitHub Issues](https://github.com/somesanity/draw-io-obsidian/issues)
- **Discussions:** [GitHub Discussions](https://github.com/somesanity/draw-io-obsidian/discussions)
- **Discord:** Join the Obsidian Discord
- **Forum:** Post in the Obsidian forum

## 💝 Support the Project

If you find this plugin useful, consider:
- ⭐ Starring the repo on GitHub
- 🐛 Reporting bugs and suggesting features
- 📢 Sharing with other Obsidian users
- ☕ [Buy me a coffee](https://buymeacoffee.com/somesanity) (optional)

---

**Happy Diagramming!** 🎨✨

*Released on November 11, 2025*

