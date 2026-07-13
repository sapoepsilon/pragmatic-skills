#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = join(root, "plugins");
const bundleDir = join(pluginsDir, "pragmatic");
const bundleSkillsDir = join(bundleDir, "skills");

if (!existsSync(bundleDir)) {
  console.error("No pragmatic bundle directory found.");
  process.exit(1);
}

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(relative(dir, path));
    }
  };
  walk(dir);
  return files.sort();
}

function directoriesMatch(a, b) {
  const aFiles = filesUnder(a);
  const bFiles = filesUnder(b);
  if (aFiles.length !== bFiles.length) return false;
  for (let i = 0; i < aFiles.length; i++) {
    if (aFiles[i] !== bFiles[i]) return false;
    if (!readFileSync(join(a, aFiles[i])).equals(readFileSync(join(b, bFiles[i])))) return false;
  }
  return true;
}

mkdirSync(bundleSkillsDir, { recursive: true });
let updated = 0;
const present = new Set();

for (const pluginName of readdirSync(pluginsDir)) {
  if (pluginName === "pragmatic") continue;
  const pluginDir = join(pluginsDir, pluginName);
  if (!statSync(pluginDir).isDirectory()) continue;

  const srcSkillsDir = join(pluginDir, "skills");
  if (!existsSync(srcSkillsDir)) continue;

  for (const skillName of readdirSync(srcSkillsDir)) {
    const srcDir = join(srcSkillsDir, skillName);
    const skillPath = join(srcDir, "SKILL.md");
    if (!statSync(srcDir).isDirectory() || !existsSync(skillPath)) continue;
    const dstDir = join(bundleSkillsDir, skillName);
    if (!directoriesMatch(srcDir, dstDir)) {
      rmSync(dstDir, { recursive: true, force: true });
      cpSync(srcDir, dstDir, { recursive: true, preserveTimestamps: false });
      updated++;
    }
    present.add(skillName);
  }
}

for (const skillName of readdirSync(bundleSkillsDir)) {
  if (!present.has(skillName)) {
    rmSync(join(bundleSkillsDir, skillName), { recursive: true, force: true });
    console.warn(`removed stale pragmatic/skills/${skillName} (no canonical plugin source)`);
  }
}

console.log(`Bundle synced. ${updated} skill director${updated === 1 ? "y" : "ies"} updated.`);
