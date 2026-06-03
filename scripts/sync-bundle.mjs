#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = join(root, "plugins");
const bundleDir = join(pluginsDir, "pragmatic");
const bundleSkillsDir = join(bundleDir, "skills");

if (!existsSync(bundleDir)) {
  console.error("No pragmatic bundle directory found.");
  process.exit(1);
}

let updated = 0;
const present = new Set();

for (const pluginName of readdirSync(pluginsDir)) {
  if (pluginName === "pragmatic") continue;
  const pluginDir = join(pluginsDir, pluginName);
  if (!statSync(pluginDir).isDirectory()) continue;

  const srcSkillsDir = join(pluginDir, "skills");
  if (!existsSync(srcSkillsDir)) continue;

  for (const skillName of readdirSync(srcSkillsDir)) {
    const srcPath = join(srcSkillsDir, skillName, "SKILL.md");
    if (!existsSync(srcPath)) continue;
    const dstDir = join(bundleSkillsDir, skillName);
    const dstPath = join(dstDir, "SKILL.md");
    mkdirSync(dstDir, { recursive: true });
    const src = readFileSync(srcPath, "utf8");
    const existing = existsSync(dstPath) ? readFileSync(dstPath, "utf8") : null;
    if (src !== existing) {
      writeFileSync(dstPath, src);
      updated++;
    }
    present.add(skillName);
  }
}

if (existsSync(bundleSkillsDir)) {
  for (const skillName of readdirSync(bundleSkillsDir)) {
    if (!present.has(skillName)) {
      console.warn(`warning: pragmatic/skills/${skillName} has no canonical source — remove it manually if intended.`);
    }
  }
}

console.log(`Bundle synced. ${updated} skill file(s) updated.`);
