# 🔶 Plugin draw.io for obsidian

> ⚠️ **FORK NOTICE**: This is a modified fork of [somesanity/draw-io-obsidian](https://github.com/somesanity/draw-io-obsidian). The enhancements in v2.1.0 were made independently without permission from the original author. This version is not officially verified. Please refer to the [AI-Assisted Development](#-ai-assisted-development) section for full disclosure.

![demo](./docs/demo.gif)

## 🚀 Features

  * 🧩 **Interactivity** – bind your note links to shapes, add external links, and insert markdown fragments!  
  * 🛜 **Works 100% offline** – No internet required!
  * 🔐 **Privacy-first** – Runs a local server on your machine.
  * 📐 **Mermaid & LaTeX** - Support Mermaid and LaTeX, and export pdf.
  * 📁 **Multiple file formats** - Support `.drawio`, `.drawid`, and `.drawio.svg` files.
  * ⚡ **Fast performance** - Iframe caching for instant diagram switching.
  * 🎨 **SVG support** - Open any SVG file with draw.io via right-click menu.

## ✨ Interactive diagrams

![docs/demo.gif](docs/interactiveDiagram-demo.gif)

### 🖇️ Linking shapes with notes & external links

To link your notes or external resources to shapes, right-click on a shape in the editor and select `Add link`. Then, insert the link to your note or external resource.

🔗 linking notes demo:

![docs/demo.gif](docs/linkingnotedemo.gif)

🌐 creating an external link demo:

![docs/demo.gif](docs/linking-external-resources.gif)

### 📄 Markdown fragments

**Markdown fragments** are pieces of markdown that you can add to diagrams.

Right-click on the shape or element you want to bind a markdown fragment to, then select `Add data...`.  
The data name should follow the pattern `md-number`, for example: `md-1`, `md-2`.  
Next, insert the markdown text into the property.

📜 Adding a markdown fragment demo:

![docs/demo.gif](/docs//markdown-fragment-demo.gif)

### 📐 Mermaid & LaTeX

You can use mermaid and LaTeX (Default support in draw.io)

![docs/LaTeX&mermaid.gif](docs/LaTeX&mermaid.gif)

## ❓ How It Works

This plugin launches a **local web server** that serves the [Draw.io web app](https://github.com/jgraph/drawio) directly from your machine.

  * When you open your Obsidian vault and enable the plugin, it spins up the server automatically.
  * You can then create, edit, and save diagrams directly within Obsidian — **completely offline**.

## 📦 Installation Guide

there are 2 ways: 

1. using plugin for obsidian - [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. manually install


>📌 The `drawioclient` folder, which contains the core Draw.io application, is crucial for this plugin to function correctly. Because GitHub doesn't allow direct folder uploads and to ensure faster downloads, the `drawioclient` content is provided as an archive. A small script (`drawIoClientManager.ts`) will automatically extract it for you upon installation. Please allow a brief moment for this process to complete.!

![initial-plugin-demo](./docs/initial-plugin-demo.gif)

> This only needs to be done once.

### 🕗 Install with using BRAT

![install-BRAT-demo](./docs/installWithBRAT.gif)

1. install [BRAT from repository](https://github.com/TfTHacker/obsidian42-brat) or from [obsidian plugin list](obsidian://show-plugin?id=obsidian42-brat)
2. open BRAT plugin `settings` > click `Add beta-plugin`
3. paste in input `https://github.com/chendx-github/draw-io-obsidian` select version and click to `Add plugin`.

### 🙌 manually install

1.  **Clone or download this repository**:

    ```bash
    git clone https://github.com/chendx-github/draw-io-obsidian.git
    ```

    Or download the ZIP and extract it.

2.  **Build the plugin**

    ```bash
    npm install
    npm run dev
    ```

3.  **Move the plugin files to your Obsidian vault**:

      * Go to your Obsidian vault:

        ```
        .obsidian/plugins/
        ```

      * Create a folder, e.g., `draw-io`.

      * Copy these files and folders:

        ```
        manifest.json
        main.js
        drawioclient/
        styles.css
        ```

    > Your plugin directory should look like this:

    > ```bash
    > .obsidian/
    > └── plugins/
    >     └── draw-io/
    >         ├── manifest.json
    >         ├── main.js
    >         ├── styles.css
    >         └── drawioclient   <-- This folder is essential!
    > ```

4.  **Enable the plugin** in Obsidian:

      * Open **Settings → Community Plugins → Enable plugin**.

## 🆕 What's New in v2.1.0

### Enhanced File Format Support
- ✅ **`.drawid` files** - Full support for this draw.io format alongside `.drawio`
- ✅ **`.drawio.svg` files** - Automatically detected and opened with draw.io editor
- ✅ **Any SVG files** - Right-click context menu option "Open with draw.io"

### Performance Improvements ⚡
- **10x faster loading** - Iframe caching mechanism for instant diagram switching
- **Optimized startup** - Smart server polling reduces initial loading time
- **Seamless switching** - No delay when switching between diagrams

### Better User Experience
- **Create from folder** - Right-click any folder to create a new diagram
- **Smart file handling** - Proper temporary/pinned tab behavior
- **Custom icons** - Theme-aware file icons in the file explorer
- **Improved menus** - Intuitive right-click context menu options

### Critical Bug Fixes
- 🐛 Fixed `.drawio` files being incorrectly saved as SVG format
- 🐛 Fixed editor title not updating when opening files
- 🐛 Fixed close button not responding
- 🐛 Fixed file corruption issues during save operations
- 🐛 Fixed slow loading times when opening diagrams

### Technical Enhancements
- Migrated from `ItemView` to `FileView` for better Obsidian integration
- Enhanced XML/SVG content extraction logic
- Improved error handling and user feedback
- Better state management and lifecycle handling

## 🎯 Usage Tips

### Creating New Diagrams
- **Method 1**: Click the shapes icon in the ribbon
- **Method 2**: Use command palette → "Create new diagram"
- **Method 3**: Right-click a folder → "Create new diagram"
- **Method 4**: Right-click in editor → "Create new diagram"

### Opening Existing Files
- **`.drawio` / `.drawid`**: Click to open directly
- **`.drawio.svg`**: Click to open automatically
- **Any `.svg`**: Right-click → "Open with draw.io"

### File Format Recommendations
- Use `.drawio` for standard diagrams (XML format)
- Use `.drawid` for alternative draw.io format
- Use `.drawio.svg` for diagrams you want to view as images in markdown
- Use plain `.svg` when you need both image viewing and editing capability

## 🤖 AI-Assisted Development

**Transparency Notice**: Portions of v2.1.0 were developed with AI assistance (Claude by Anthropic) to:
- Implement file format support for `.drawid` files
- Optimize performance with iframe caching
- Fix critical bugs related to file saving and UI responsiveness
- Improve code architecture and error handling
- Enhance user experience with better tab management

**Important Disclaimer**: 
- This is a **forked and modified version** from the original [somesanity/draw-io-obsidian](https://github.com/somesanity/draw-io-obsidian) repository
- These enhancements were made **without permission** from the original author
- This version is **not officially verified** or endorsed by the original author or Obsidian
- All modifications and their consequences are the **sole responsibility** of this fork's maintainer
- AI was used as a development tool, but all final decisions and implementations are human-verified
- **Use at your own risk** - thorough testing is recommended before using in production environments

## 📝 Supported File Formats

| Format | Description | When to Use |
|--------|-------------|-------------|
| `.drawio` | Standard draw.io XML format | Default choice for most diagrams |
| `.drawid` | Alternative draw.io format | Compatible with draw.io desktop app |
| `.drawio.svg` | SVG with embedded draw.io data | When you want image preview in markdown |
| `.svg` | Any SVG file | Can be opened via right-click menu |

## 🔧 Troubleshooting

### Common Issues

**Problem**: Diagram loads slowly on first open
- **Solution**: This is normal for first load (server startup). Subsequent opens will be instant thanks to iframe caching.

**Problem**: SVG file opens as image instead of draw.io editor
- **Solution**: Use right-click → "Open with draw.io" to open any SVG with the editor.

**Problem**: Changes not saving
- **Solution**: Ensure you have write permissions to the vault folder. Check console for errors.

**Problem**: Plugin not loading
- **Solution**: Wait for the `drawioclient` folder to extract (first time only). Check that the folder exists in the plugin directory.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Original Author**: [somesanity](https://github.com/somesanity) - For creating the original draw-io-obsidian plugin
- [draw.io](https://github.com/jgraph/drawio) - The amazing diagramming tool
- [Obsidian](https://obsidian.md/) - The powerful knowledge base
- The Obsidian community for feedback and testing
- AI assistance provided by Claude (Anthropic) for development optimization

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/chendx-github/draw-io-obsidian/issues)
- **Discussions**: [GitHub Discussions](https://github.com/chendx-github/draw-io-obsidian/discussions)
- **Original Repository**: [somesanity/draw-io-obsidian](https://github.com/somesanity/draw-io-obsidian)
- **Discord**: Join the Obsidian Discord community

---

**Made with ❤️ for the Obsidian community**
