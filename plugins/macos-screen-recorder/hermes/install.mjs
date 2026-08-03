#!/usr/bin/env node
// Install macos-screen-recorder into a Hermes Agent profile without copying
// machine-local config, storage credentials, signing identities, or host details.

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, "..");
const skillName = "macos-screen-recorder";
const source = join(pluginRoot, "skills", skillName);
const hermesHome = process.env.HERMES_HOME || join(homedir(), ".hermes");
const category = process.env.HERMES_SKILL_CATEGORY || "pragmatic-skills";
const target = join(hermesHome, "skills", category, skillName);

if (!existsSync(join(source, "SKILL.md"))) throw new Error(`Missing skill source: ${source}`);
mkdirSync(dirname(target), { recursive: true });
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true, preserveTimestamps: false });
console.log(`Installed ${skillName} to ${target}`);
console.log("Local capture config remains under ~/.config/macos-qa-capture and is never copied into the skill.");
console.log("Run `/reload-skills` in an active Hermes session, or start a new session.");
