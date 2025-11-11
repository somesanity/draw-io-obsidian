# 🚀 Release Checklist for v2.1.0

## 📋 Pre-Release Checklist

### Code & Build
- [ ] All features tested and working
- [ ] No console errors or warnings
- [ ] Code reviewed and cleaned up
- [ ] Build successful: `npm run build`
- [ ] Plugin tested in Obsidian desktop app
- [ ] Tested on Windows / macOS / Linux

### Documentation
- [x] README.md is up to date
- [x] manifest.json version updated to 2.1.0
- [x] versions.json updated with new version
- [ ] package.json version updated to 2.1.0
- [ ] CHANGELOG.md created/updated

### Files Required for Release
- [x] `main.js` (compiled)
- [x] `manifest.json`
- [x] `styles.css`
- [x] `drawioclient/` folder or zip

## 📦 GitHub Release Steps

### 1. Commit & Tag
```bash
# Commit all changes
git add .
git commit -m "Release v2.1.0: Added drawid support, iframe caching, improved UX"

# Create and push tag
git tag -a 2.1.0 -m "Release version 2.1.0"
git push origin main
git push origin 2.1.0
```

### 2. Create GitHub Release
- [ ] Go to https://github.com/somesanity/draw-io-obsidian/releases/new
- [ ] Choose tag: 2.1.0
- [ ] Release title: `v2.1.0`
- [ ] Add release notes (see PUBLISHING_GUIDE.md)
- [ ] Upload files:
  - [ ] main.js
  - [ ] manifest.json
  - [ ] styles.css
- [ ] Publish release

## 🌐 Submit to Obsidian Plugin Directory

### 3. Fork & Clone obsidian-releases
```bash
# Fork: https://github.com/obsidianmd/obsidian-releases
git clone https://github.com/YOUR_USERNAME/obsidian-releases.git
cd obsidian-releases
```

### 4. Add Plugin Entry
- [ ] Edit `community-plugins.json`
- [ ] Add draw.io plugin entry (alphabetically)
```json
{
    "id": "drawio",
    "name": "draw.io",
    "author": "somesanity",
    "description": "Create and edit diagrams with draw.io (diagrams.net), locally and offline.",
    "repo": "somesanity/draw-io-obsidian"
}
```

### 5. Create Pull Request
```bash
git add community-plugins.json
git commit -m "Add draw.io plugin"
git push origin main
```
- [ ] Go to your fork on GitHub
- [ ] Click "New Pull Request"
- [ ] Fill in PR template (see PUBLISHING_GUIDE.md)
- [ ] Submit PR

## ✅ Post-Submission

- [ ] Monitor PR for feedback
- [ ] Respond to review comments promptly
- [ ] Make requested changes if needed
- [ ] Wait for approval (1-3 weeks typically)
- [ ] Announce on Obsidian forum/Discord once approved

## 📝 Release Notes for v2.1.0

```markdown
## ✨ What's New in v2.1.0

### 🆕 New Features
- ✅ Support for `.drawid` file extension
- ✅ Full support for `.drawio.svg` files
- ✅ Right-click "Open with draw.io" option for any SVG file
- ✅ Create new diagrams from folder context menu
- ✅ Iframe caching for 10x faster diagram switching
- ✅ Better temporary/pinned tab behavior

### 🐛 Bug Fixes
- Fixed `.drawio` files being saved as SVG format
- Fixed editor title not updating when opening files
- Fixed close button not responding
- Fixed slow loading times when opening diagrams
- Improved file corruption prevention

### 🎨 UI/UX Improvements
- New custom SVG file icons (theme-aware)
- Cleaner right-click context menus
- Better file type recognition
- Improved tab management

### 🔧 Technical Improvements
- Switched to FileView for better Obsidian integration
- Optimized server startup with polling mechanism
- Better XML/SVG content extraction
- Improved error handling

### 📚 Documentation
- Added comprehensive publishing guide
- Added release checklist
- Improved README with latest features
```

## 🎯 Success Criteria

Before marking as complete:
- [ ] No critical bugs reported
- [ ] All core features working
- [ ] Documentation complete and accurate
- [ ] GitHub release published
- [ ] PR submitted to obsidian-releases
- [ ] Community notified (after approval)

---

**Last Updated:** 2025-11-11
**Target Release Date:** TBD (after Obsidian team approval)

