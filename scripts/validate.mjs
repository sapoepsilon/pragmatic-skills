#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
const pluginsDir = join(root, "plugins");
const pluginSchemaPath = join(root, "schema", "plugin.schema.json");
const marketplaceSchemaPath = join(root, "schema", "marketplace.schema.json");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validatePlugin = ajv.compile(JSON.parse(readFileSync(pluginSchemaPath, "utf8")));
const validateMarketplace = ajv.compile(JSON.parse(readFileSync(marketplaceSchemaPath, "utf8")));

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

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

if (!existsSync(marketplacePath)) {
  fail(".claude-plugin/marketplace.json", "missing");
} else {
  const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
  if (!validateMarketplace(marketplace)) {
    for (const e of validateMarketplace.errors ?? [])
      fail("marketplace.json", `${e.instancePath || "/"} ${e.message}`);
  }

  for (const p of marketplace.plugins ?? []) {
    if (typeof p.source === "string") {
      const resolved = resolve(root, p.source);
      if (!existsSync(resolved)) {
        fail(`marketplace.json:${p.name}`, `source path does not exist: ${p.source}`);
      }
    }
  }
}

const pluginDirs = existsSync(pluginsDir)
  ? readdirSync(pluginsDir).filter((name) => {
      const p = join(pluginsDir, name);
      return statSync(p).isDirectory() && !name.startsWith(".");
    })
  : [];

const skillDirs = new Map();
const bundlePlugins = [];

for (const pluginName of pluginDirs) {
  const pluginDir = join(pluginsDir, pluginName);
  const manifestPath = join(pluginDir, ".claude-plugin", "plugin.json");

  if (!existsSync(manifestPath)) {
    fail(pluginName, "missing .claude-plugin/plugin.json");
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    fail(pluginName, `plugin.json is not valid JSON: ${err.message}`);
    continue;
  }

  if (!validatePlugin(manifest)) {
    for (const e of validatePlugin.errors ?? [])
      fail(`${pluginName}/plugin.json`, `${e.instancePath || "/"} ${e.message}`);
    continue;
  }
  if (manifest.name !== pluginName) {
    fail(pluginName, `plugin.json name (${manifest.name}) must match directory name`);
  }

  const skillsDir = join(pluginDir, "skills");
  if (existsSync(skillsDir)) {
    for (const skillName of readdirSync(skillsDir)) {
      const skillDir = join(skillsDir, skillName);
      if (!statSync(skillDir).isDirectory()) continue;
      const skillPath = join(skillDir, "SKILL.md");
      if (!existsSync(skillPath)) {
        fail(`${pluginName}/skills/${skillName}`, "missing SKILL.md");
        continue;
      }
      const content = readFileSync(skillPath, "utf8");
      if (!content.startsWith("---\n")) {
        fail(`${pluginName}/skills/${skillName}/SKILL.md`, "missing YAML frontmatter");
      }
      if (pluginName !== "pragmatic") skillDirs.set(skillName, skillDir);
    }
  }

  if (pluginName === "pragmatic") bundlePlugins.push(pluginDir);
}

for (const bundleDir of bundlePlugins) {
  const skillsDir = join(bundleDir, "skills");
  if (!existsSync(skillsDir)) continue;
  for (const skillName of readdirSync(skillsDir)) {
    const bundleSkillDir = join(skillsDir, skillName);
    if (!statSync(bundleSkillDir).isDirectory()) continue;
    const canonicalDir = skillDirs.get(skillName);
    if (canonicalDir === undefined) {
      fail(
        `pragmatic/skills/${skillName}`,
        `bundle includes skill but no canonical plugin found at plugins/${skillName}/`,
      );
      continue;
    }
    const bundleFiles = filesUnder(bundleSkillDir);
    const canonicalFiles = filesUnder(canonicalDir);
    if (bundleFiles.join("\n") !== canonicalFiles.join("\n")) {
      fail(
        `pragmatic/skills/${skillName}`,
        `file set is out of sync with plugins/${skillName}/skills/${skillName} — run 'npm run sync'`,
      );
      continue;
    }
    for (const file of canonicalFiles) {
      const bundleContent = readFileSync(join(bundleSkillDir, file));
      const canonicalContent = readFileSync(join(canonicalDir, file));
      if (!bundleContent.equals(canonicalContent)) {
        fail(
          `pragmatic/skills/${skillName}/${file}`,
          `out of sync with plugins/${skillName}/skills/${skillName}/${file} — run 'npm run sync'`,
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`Validated ${pluginDirs.length} plugin(s). All good.`);
