#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "schema", "skill.schema.json");
const skillsDir = join(root, "skills");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const errors = [];
const seenNames = new Set();

function fail(skillDir, message) {
  errors.push(`${skillDir}: ${message}`);
}

const entries = existsSync(skillsDir)
  ? readdirSync(skillsDir).filter((entry) => {
      const p = join(skillsDir, entry);
      return statSync(p).isDirectory() && !entry.startsWith(".");
    })
  : [];

for (const dirName of entries) {
  const skillDir = join(skillsDir, dirName);
  const manifestPath = join(skillDir, "manifest.yml");

  if (!existsSync(manifestPath)) {
    fail(dirName, "missing manifest.yml");
    continue;
  }

  let manifest;
  try {
    manifest = parseYaml(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    fail(dirName, `manifest.yml is not valid YAML: ${err.message}`);
    continue;
  }

  if (!validate(manifest)) {
    for (const err of validate.errors ?? []) {
      fail(dirName, `manifest ${err.instancePath || "/"} ${err.message}`);
    }
    continue;
  }

  if (manifest.name !== dirName) {
    fail(dirName, `manifest.name (${manifest.name}) must match directory name (${dirName})`);
  }
  if (seenNames.has(manifest.name)) {
    fail(dirName, `duplicate skill name: ${manifest.name}`);
  }
  seenNames.add(manifest.name);

  if (!existsSync(join(skillDir, "README.md"))) {
    fail(dirName, "missing README.md");
  }

  for (const agent of ["claude_code", "codex"]) {
    const cfg = manifest.compatibility?.[agent];
    if (!cfg?.supported) continue;
    const entry = cfg.entry;
    if (!entry) {
      fail(dirName, `compatibility.${agent}.entry is required when supported=true`);
      continue;
    }
    const entryPath = join(skillDir, entry);
    if (!existsSync(entryPath)) {
      fail(dirName, `compatibility.${agent}.entry points to missing file: ${entry}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`Validated ${entries.length} skill(s). All good.`);
