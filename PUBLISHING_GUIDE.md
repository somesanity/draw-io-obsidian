# 📦 发布插件到 Obsidian 官方插件库指南

> ⚠️ **重要声明**: 
> - 这是一个从 [somesanity/draw-io-obsidian](https://github.com/somesanity/draw-io-obsidian) fork 的修改版本
> - **不建议将此 fork 版本提交到官方插件库**，因为：
>   1. 原仓库已经在官方库中或正在审核中
>   2. Fork 版本未经原作者授权
>   3. 可能导致版本冲突和用户混淆
> - 此文档仅供学习和参考，建议贡献改进到原仓库
> - 如需发布自己的版本，应该创建全新的插件 ID 和名称

本指南将帮助你将 draw.io 插件发布到 Obsidian 官方插件库，供所有 Obsidian 用户使用。

## 🎯 发布前准备清单

### 1. 完善项目文件

#### ✅ `manifest.json` (已完成)
```json
{
    "id": "drawio",
    "name": "draw.io",
    "version": "2.1.0",
    "minAppVersion": "0.15.0",
    "description": "Create and edit diagrams with draw.io (diagrams.net), locally and offline.",
    "author": "somesanity",
    "authorUrl": "https://github.com/somesanity",
    "isDesktopOnly": true
}
```

#### ✅ `README.md` (已完成)
- 包含功能介绍
- 安装说明
- 使用演示 GIF
- 特性列表

#### 📝 需要添加的文件

1. **`versions.json`** - 版本历史记录
```json
{
    "2.1.0": "0.15.0",
    "2.0.0": "0.15.0",
    "1.0.0": "0.15.0"
}
```

2. **更新 `package.json`**
```json
{
    "name": "obsidian-drawio-plugin",
    "version": "2.1.0",
    "description": "Create and edit diagrams with draw.io (diagrams.net), locally and offline.",
    "author": "somesanity",
    "authorUrl": "https://github.com/somesanity",
    "fundingUrl": "https://buymeacoffee.com/yourusername"
}
```

### 2. 创建 GitHub Release

#### 步骤：

1. **确保代码已推送到 GitHub**
```bash
git add .
git commit -m "Prepare for v2.1.0 release"
git push origin main
```

2. **创建版本标签**
```bash
git tag -a 2.1.0 -m "Release version 2.1.0"
git push origin 2.1.0
```

3. **在 GitHub 上创建 Release**
   - 访问你的仓库：`https://github.com/somesanity/draw-io-obsidian`
   - 点击 "Releases" → "Create a new release"
   - 选择标签：`2.1.0`
   - 填写 Release 标题：`v2.1.0`
   - 添加更新说明：

```markdown
## ✨ What's New in v2.1.0

### 🆕 New Features
- ✅ Support for `.drawid` file extension
- ✅ Support for `.drawio.svg` files
- ✅ Right-click menu to open any SVG file with draw.io
- ✅ Create new diagrams from folder context menu
- ✅ Iframe caching for faster loading
- ✅ Improved file tab management (temporary/pinned tabs)

### 🐛 Bug Fixes
- Fixed file saving format issues
- Fixed editor title not updating
- Fixed close button not responding
- Improved performance when switching between diagrams

### 🎨 UI Improvements
- Better file icons in file explorer
- Cleaner context menu options
```

4. **上传必需的文件到 Release**
   - `main.js` (编译后的主文件)
   - `manifest.json`
   - `styles.css`
   - `drawioclient.zip` (如果需要)

## 📤 提交到 Obsidian 官方插件库

### 步骤 1: Fork obsidian-releases 仓库

1. 访问 [obsidian-releases](https://github.com/obsidianmd/obsidian-releases)
2. 点击右上角的 "Fork" 按钮
3. 克隆你 fork 的仓库到本地

```bash
git clone https://github.com/YOUR_USERNAME/obsidian-releases.git
cd obsidian-releases
```

### 步骤 2: 添加你的插件信息

1. **编辑 `community-plugins.json`**

在文件末尾添加你的插件信息（保持字母顺序）：

```json
{
    "id": "drawio",
    "name": "draw.io",
    "author": "somesanity",
    "description": "Create and edit diagrams with draw.io (diagrams.net), locally and offline.",
    "repo": "somesanity/draw-io-obsidian"
}
```

### 步骤 3: 创建 Pull Request

1. **提交更改**
```bash
git add community-plugins.json
git commit -m "Add draw.io plugin"
git push origin main
```

2. **创建 Pull Request**
   - 访问你 fork 的仓库
   - 点击 "Pull Request" → "New Pull Request"
   - 确保 base 是 `obsidianmd/obsidian-releases:master`
   - 填写 PR 标题：`Add draw.io plugin`
   - 填写描述：

```markdown
## Plugin Submission

**Plugin Name:** draw.io
**Plugin Repository:** https://github.com/somesanity/draw-io-obsidian
**Latest Release:** v2.1.0

### Description
Create and edit diagrams with draw.io (diagrams.net), locally and offline. 
Supports .drawio, .drawid, and .drawio.svg file formats with full offline functionality.

### Features
- 100% offline diagram creation and editing
- Interactive diagrams with note linking
- Markdown fragment support
- Mermaid & LaTeX support
- Privacy-first with local server
- Desktop only

### Checklist
- [x] Plugin has a valid manifest.json
- [x] Plugin has a README.md with installation and usage instructions
- [x] Plugin has a LICENSE file
- [x] Plugin has a GitHub release with required files
- [x] Plugin works on desktop platforms
- [x] Plugin is tested and stable

### Additional Notes
This plugin runs a local server to serve the draw.io web application. 
The drawioclient folder is automatically extracted on first use.
```

3. **点击 "Create Pull Request"**

## ⏳ 审核过程

### 预期时间线
- **初步审核**: 1-3 天
- **反馈和修改**: 取决于需要的更改
- **最终批准**: 1-2 周（总计）

### 审核标准
Obsidian 团队会检查：
- ✅ 代码质量和安全性
- ✅ 插件功能描述准确性
- ✅ 遵循 Obsidian API 最佳实践
- ✅ 不包含恶意代码
- ✅ README 文档完整性
- ✅ Release 文件完整性

### 可能的反馈
- 代码安全问题
- API 使用不当
- 文档不完整
- 性能问题

## 📋 版本更新流程

发布新版本时：

1. **更新版本号**
```bash
npm version patch  # 或 minor, major
```

2. **更新文件**
   - `manifest.json` 中的 version
   - `versions.json` 添加新版本
   - `package.json` 中的 version

3. **创建新的 GitHub Release**
```bash
git tag -a 2.1.1 -m "Release version 2.1.1"
git push origin 2.1.1
```

4. **自动通知**
   - 一旦你的插件被接受，后续版本会自动被 Obsidian 检测
   - 用户可以在插件市场看到更新

## 🔧 发布前测试清单

在提交 PR 前，确保：

- [ ] 插件在 Windows, macOS, Linux 上都能正常工作
- [ ] 所有核心功能都已测试
- [ ] 没有控制台错误
- [ ] 文档准确反映功能
- [ ] 版本号正确
- [ ] GitHub Release 包含所有必需文件
- [ ] README.md 包含清晰的安装和使用说明
- [ ] 遵循 Obsidian 插件开发最佳实践

## 📚 有用的资源

- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Obsidian Releases Repo](https://github.com/obsidianmd/obsidian-releases)
- [Plugin Review Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)

## 💡 提示

1. **保持良好的沟通**: 及时回复审核人员的反馈
2. **遵循指南**: 仔细阅读并遵循 Obsidian 的插件指南
3. **测试充分**: 在多个平台上测试你的插件
4. **文档清晰**: 确保 README 易于理解
5. **保持更新**: 定期更新插件以支持新的 Obsidian 版本

## ❓ 常见问题

### Q: 提交后多久会被审核？
A: 通常 1-3 周，取决于队列长度和插件复杂度。

### Q: 可以在审核期间修改代码吗？
A: 可以，但需要在 PR 中更新。

### Q: 插件被拒绝了怎么办？
A: 根据反馈修改后可以重新提交。

### Q: 如何推广我的插件？
A: 在 Obsidian 论坛、Reddit、Discord 分享，但要遵守社区规则。

---

## 🚀 下一步行动

1. ✅ 创建 `versions.json` 文件
2. ✅ 更新 `package.json`
3. ✅ 创建 GitHub Release v2.1.0
4. ✅ Fork obsidian-releases 仓库
5. ✅ 添加插件信息到 community-plugins.json
6. ✅ 创建 Pull Request
7. ⏳ 等待审核和反馈

祝你发布顺利！🎉

