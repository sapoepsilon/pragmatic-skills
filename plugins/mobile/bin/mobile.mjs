#!/usr/bin/env node
// mobile auto-shipper CLI — setup + probe (Slice 1).
// Config tiers:
//   machine (secrets, NEVER committed): ~/.config/mobile-autoship/machine.json
//     proxy endpoints + key, device targets (iOS sim, Android MCP, Figma MCP).
//   project committed (shareable, no secrets):   <repo>/.mobileship.json
//     build cmd, qa script, channel type, branch prefix.
//   project local (env, NEVER committed):         <repo>/.mobileship.local.json
//     backend URL, machine/device overrides, anything environment-specific.
// Commands: probe | init [dir] | show
// Orchestrator (state machine, channel, QA loop) lands in later slices. The
// orchestrating agent (Hermes / Claude Code) is the coder — no external engine CLI.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir, platform } from "node:os";
import { execSync } from "node:child_process";

const CONFIG_HOME = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
const MACHINE_PATH = join(CONFIG_HOME, "mobile-autoship", "machine.json");
const PROJECT_FILE = ".mobileship.json";
const PROJECT_LOCAL_FILE = ".mobileship.local.json";

const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null);

function writeJson(path, obj) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

async function reachable(url, apiKey, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const res = await fetch(`${url.replace(/\/$/, "")}/models`, { headers, signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function has(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function probe() {
  const machine = readJson(MACHINE_PATH);
  const line = (ok, label, detail = "") => `  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`;

  console.log(`mobile-autoship probe — ${platform()} @ ${homedir()}`);
  console.log(`machine config: ${existsSync(MACHINE_PATH) ? MACHINE_PATH : "(none — run the mobile-setup skill)"}`);

  console.log("\nengine:");
  console.log(line(true, "coder", "the orchestrating agent (Hermes / Claude Code) — no external CLI"));

  console.log("\ndevice / QA targets:");
  const isMac = platform() === "darwin";
  console.log(line(isMac && has("xcrun"), "iOS simulator (local)", isMac ? "" : "macOS only"));
  console.log(line(has("adb"), "adb (local Android)", has("adb") ? "" : "optional"));
  const android = machine?.devices?.android;
  if (android?.url) {
    const ok = await reachable(android.url, android.apiKey);
    console.log(line(ok, `Android emulator MCP (${android.url})`, ok ? "reachable" : "unreachable"));
  } else {
    console.log("  ✗ Android emulator MCP — not configured");
  }
  const figma = machine?.devices?.figma;
  if (figma) console.log(line(isMac, "Figma MCP bridge", isMac ? "configured" : "macOS only — ignored on this box"));
  console.log();
}

function init(dir = ".") {
  const committed = resolve(dir, PROJECT_FILE);
  const local = resolve(dir, PROJECT_LOCAL_FILE);
  if (existsSync(committed)) {
    console.error(`${committed} already exists — not overwriting.`);
    process.exit(1);
  }
  // Committed: shareable, no secrets, no environment specifics.
  writeJson(committed, {
    name: "",
    build: "",
    qa: { script: "", device: "android" },
    branchPrefix: "autoship/",
    channel: { type: "telegram" },
  });
  // Local: environment, never committed.
  if (!existsSync(local)) {
    writeJson(local, {
      backendUrl: "",
      deviceOverrides: {},
      channel: { chat: "" },
      notes: "Environment-specific + secrets. This file is gitignored — never commit it.",
    });
  }
  console.log(`wrote ${committed} (commit) and ${local} (gitignored).`);
  console.log("Fill them via the mobile-setup skill. Add '.mobileship.local.json' to the project's .gitignore.");
}

function show() {
  console.log("machine:", existsSync(MACHINE_PATH) ? MACHINE_PATH : "(none)");
  console.log(JSON.stringify(readJson(MACHINE_PATH) ?? {}, null, 2));
  for (const f of [PROJECT_FILE, PROJECT_LOCAL_FILE]) {
    const p = resolve(f);
    console.log(`\n${f}:`, existsSync(p) ? p : "(none in cwd)");
    console.log(JSON.stringify(readJson(p) ?? {}, null, 2));
  }
}

const cmd = process.argv[2];
const arg = process.argv[3];
if (cmd === "probe") await probe();
else if (cmd === "init") init(arg);
else if (cmd === "show") show();
else {
  console.log("usage: mobile <probe|init [dir]|show>");
  process.exit(cmd ? 1 : 0);
}
