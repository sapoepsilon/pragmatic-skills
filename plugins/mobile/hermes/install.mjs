#!/usr/bin/env node
// Install the mobile pragmatic skills into a Hermes Agent profile.
// This intentionally uses only Node stdlib so it can run anywhere Hermes/Node exist.

import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, "..");
const repoRoot = resolve(mobileRoot, "..", "..");
const skillsRoot = join(mobileRoot, "skills");
const hermesHome = process.env.HERMES_HOME || join(homedir(), ".hermes");
const category = process.env.HERMES_SKILL_CATEGORY || "pragmatic-skills";
const targetSkills = join(hermesHome, "skills", category);
const binDir = process.env.HERMES_INSTALL_BIN || join(homedir(), ".local", "bin");
const cliTarget = join(binDir, "mobile-autoship");

function copySkill(skillName) {
  const src = join(skillsRoot, skillName, "SKILL.md");
  if (!existsSync(src)) throw new Error(`Missing skill: ${src}`);
  const dstDir = join(targetSkills, skillName);
  mkdirSync(dstDir, { recursive: true });
  copyFileSync(src, join(dstDir, "SKILL.md"));
  return join(dstDir, "SKILL.md");
}

function main() {
  const skillNames = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  mkdirSync(targetSkills, { recursive: true });
  for (const skillName of skillNames) copySkill(skillName);

  mkdirSync(binDir, { recursive: true });
  rmSync(cliTarget, { force: true });
  copyFileSync(join(mobileRoot, "bin", "mobile.mjs"), cliTarget);
  chmodSync(cliTarget, 0o755);

  console.log(`Installed ${skillNames.length} skill(s) to ${targetSkills}`);
  console.log(`Installed CLI to ${cliTarget}`);
  console.log("Run `/reload-skills` in an active Hermes session, or start a new session, then use `mobile-setup`.");
}

main();
