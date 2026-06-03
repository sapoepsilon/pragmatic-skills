#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "skills");
const readmePath = join(root, "README.md");

const skills = [];
if (existsSync(skillsDir)) {
  for (const dirName of readdirSync(skillsDir)) {
    const p = join(skillsDir, dirName);
    if (!statSync(p).isDirectory() || dirName.startsWith(".")) continue;
    const manifestPath = join(p, "manifest.yml");
    if (!existsSync(manifestPath)) continue;
    try {
      skills.push(parseYaml(readFileSync(manifestPath, "utf8")));
    } catch {
      // skip malformed
    }
  }
}

skills.sort((a, b) => a.name.localeCompare(b.name));

let block;
if (skills.length === 0) {
  block = "_No skills published yet._";
} else {
  const rows = skills.map((s) => {
    const targets = [];
    if (s.compatibility?.claude_code?.supported) targets.push("Claude Code");
    if (s.compatibility?.codex?.supported) targets.push("Codex");
    const tags = (s.tags ?? []).map((t) => `\`${t}\``).join(" ");
    return `| [\`${s.name}\`](./skills/${s.name}) | ${s.description.replace(/\n+/g, " ")} | ${targets.join(", ")} | ${tags} |`;
  });
  block = ["| Skill | Description | Targets | Tags |", "| --- | --- | --- | --- |", ...rows].join("\n");
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
  console.log(`Catalog updated with ${skills.length} skill(s).`);
}
