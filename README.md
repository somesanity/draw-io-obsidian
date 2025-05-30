# Obsidian draw io plugin

it plugin is an alternative [this plugin](https://github.com/jensmtg/obsidian-diagrams-net). I wanted make my plugin independent from internet. I also wanted to keep the full design and style of draw io.

## ❓ How does the plugin work?

Essentially it runs a separate localhost-server, when the plugin active or Obsidian opened, thank to the [serve package](https://www.npmjs.com/package/serve), the server is started and is being deployed [draw io's web app](https://github.com/jgraph/drawio).

### ⚠️ not perfectly

because it uses separate localhost-server, and I don't use embed mode in Ddraw.io web app, There are some nuances:

1. You should save your diagrams manually: `file` > `save as...` > **`download`**.
2. If you want to edit your diagrams, you should do it like this: `file` > `import from` > **`device...`**.

## 📦 How install plugin?

1. clone this repository.
2. unzip it to any directory.
3. `cd drawIo-plugin`.
4. `npm i`.
5. `npm run dev` (only if `main.js` not exist).
6. move the `webapp folder`, `manifest.json` and `main.js` to your Obsidian vault:
	`.obsidian` > `plugins` > (create new directory for draw io plugin).
7. Open your vault and enable the plugin.


> main.js and webapp folder should be placed together.
>
>	```lua
>	└── plugin
>		├── webapp     <-- It's important!!
>		└── main.js
>		└── manifest.json
>	```