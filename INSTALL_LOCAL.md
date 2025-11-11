# 本地安装测试指南

## 构建完成 ✅

插件已经成功构建，生成了以下文件：
- `main.js` - 编译后的插件主文件
- `manifest.json` - 插件清单文件
- `styles.css` - 样式文件

## 安装步骤

### 方法一：手动安装（推荐用于本地测试）

1. **找到你的 Obsidian 插件目录**
   - Windows: `你的Vault路径\.obsidian\plugins\`
   - Mac: `你的Vault路径/.obsidian/plugins/`
   - Linux: `你的Vault路径/.obsidian/plugins/`

2. **创建插件文件夹**
   - 在插件目录下创建一个名为 `draw-io` 的文件夹

3. **复制必要文件**
   将以下文件复制到 `draw-io` 文件夹中：
   ```
   main.js
   manifest.json
   styles.css
   locales/          (整个文件夹)
   webapp/           (整个文件夹，如果存在)
   ```

4. **启用插件**
   - 打开 Obsidian
   - 进入 `设置` → `第三方插件`
   - 找到 `draw.io` 插件
   - 点击 `启用`

### 方法二：使用符号链接（开发时更方便）

如果你在开发过程中需要频繁更新，可以使用符号链接：

**Windows (PowerShell):**
```powershell
# 1. 找到你的 Obsidian 插件目录
$pluginDir = "你的Vault路径\.obsidian\plugins\draw-io"

# 2. 创建符号链接
New-Item -ItemType SymbolicLink -Path $pluginDir -Target "D:\node_work\Projects\draw-io-obsidian"
```

**Mac/Linux:**
```bash
# 1. 找到你的 Obsidian 插件目录
# 2. 创建符号链接
ln -s /path/to/draw-io-obsidian ~/你的Vault路径/.obsidian/plugins/draw-io
```

## 测试新功能

安装完成后，你可以测试以下新功能：

1. **创建 .drawid 文件**
   - 使用命令面板创建新图表
   - 保存为 `.drawid` 格式

2. **编辑 .drawid 文件**
   - 右键点击 `.drawid` 文件
   - 选择 "Edit diagram" 选项

3. **在 Markdown 中链接**
   - 使用 `![[your-file.drawid]]` 或 `![alt](your-file.drawid)` 链接图表

4. **验证功能**
   - 检查文件是否能正确加载
   - 检查保存时是否保持 XML 格式（而不是 SVG）
   - 检查交互式功能是否正常工作

## 开发模式

如果你需要继续开发，可以使用开发模式：

```bash
npm run dev
```

这会启动监听模式，当你修改代码时会自动重新编译 `main.js`。

## 注意事项

⚠️ **重要提示：**
- 确保 `webapp` 文件夹已存在（包含 draw.io 客户端文件）
- 如果插件无法启动，检查 Obsidian 开发者控制台（`Ctrl+Shift+I`）查看错误信息
- 首次运行可能需要解压 draw.io 客户端，请耐心等待

## 故障排除

如果遇到问题：

1. **检查文件是否完整**
   - 确保 `main.js`、`manifest.json`、`styles.css` 都在插件文件夹中

2. **检查 Obsidian 版本**
   - 确保 Obsidian 版本 >= 0.15.0（查看 manifest.json 中的 minAppVersion）

3. **查看控制台错误**
   - 打开开发者工具（`Ctrl+Shift+I`）
   - 查看 Console 标签页的错误信息

4. **重新加载插件**
   - 在设置中禁用并重新启用插件
   - 或者重启 Obsidian

