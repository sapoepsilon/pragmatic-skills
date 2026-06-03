#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = join(root, "plugins");
const readmePath = join(root, "README.md");

const plugins = [];
if (existsSync(pluginsDir)) {
  for (const dirName of readdirSync(pluginsDir)) {
    const p = join(pluginsDir, dirName);
    if (!statSync(p).isDirectory() || dirName.startsWith(".")) continue;
    const manifestPath = join(p, ".claude-plugin", "plugin.json");
    if (!existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const hasCodex = existsSync(join(p, "codex"));
      plugins.push({ ...manifest, _codex: hasCodex, _dir: dirName });
    } catch {
      // skip malformed
    }
  }
}

plugins.sort((a, b) => {
  if (a._dir === "pragmatic") return -1;
  if (b._dir === "pragmatic") return 1;
  return a._dir.localeCompare(b._dir);
});

let block;
if (plugins.length === 0) {
  block = "_No plugins published yet._";
} else {
  const rows = plugins.map((p) => {
    const targets = ["Claude Code"];
    if (p._codex) targets.push("Codex");
    const tags = (p.keywords ?? []).map((t) => `\`${t}\``).join(" ");
    return `| [\`${p._dir}\`](./plugins/${p._dir}) | ${(p.description ?? "").replace(/\n+/g, " ")} | ${targets.join(", ")} | ${tags} |`;
  });
  block = ["| Plugin | Description | Targets | Tags |", "| --- | --- | --- | --- |", ...rows].join("\n");
}

const readme = readFileSync(readmePath, "utf8");
const updated = readme.replace(
  /<!-- CATALOG:START -->[\s\S]*?<!-- CATALOG:END -->/,
  `<!-- CATALOG:START -->\n${block}\n<!-- CATALOG:END -->`,
);

if (updated === readme) {
  console.log("Catalog unchanged.");
} else {
  writeFileSync(readmePath, updated);
  console.log(`Catalog updated with ${plugins.length} plugin(s).`);
}
