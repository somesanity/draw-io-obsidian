#!/usr/bin/env node
import { chmodSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, "obsidian-plugin-installer");
const PLACEHOLDER = "__PLUGIN_DIST_DIR__";

const repoRoot = resolve(process.cwd());
const distDir = join(repoRoot, "dist");
const binDir = join(homedir(), ".local", "bin");
const destPath = join(binDir, "obsidian-plugin-installer");

let template = readFileSync(TEMPLATE_PATH, "utf8");
if (!template.includes(PLACEHOLDER)) {
	console.error(`Error: template is missing placeholder ${PLACEHOLDER}`);
	process.exit(1);
}

// Escape for double-quoted bash string assignment
const escapedDist = distDir.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
template = template.replaceAll(PLACEHOLDER, escapedDist);

mkdirSync(binDir, { recursive: true });
writeFileSync(destPath, template, { encoding: "utf8", mode: 0o755 });
chmodSync(destPath, 0o755);

console.log(`Installed obsidian-plugin-installer → ${destPath}`);
console.log(`Plugin dist directory baked in: ${distDir}`);

const pathEnv = process.env.PATH ?? "";
const pathEntries = pathEnv.split(":").filter(Boolean);
const binDirResolved = resolve(binDir);
const onPath = pathEntries.some((entry) => {
	try {
		return resolve(entry) === binDirResolved;
	} catch {
		return false;
	}
});

if (!onPath) {
	console.warn(
		`Warning: ${binDir} is not on your PATH. Add it, e.g.:\n  export PATH="$HOME/.local/bin:$PATH"`,
	);
}
