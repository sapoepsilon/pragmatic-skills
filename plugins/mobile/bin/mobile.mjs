#!/usr/bin/env node
// mobile auto-shipper CLI — setup + probe.
// Config tiers:
//   machine (secrets, NEVER committed): ~/.config/mobile-autoship/machine.json
//     engine choice, optional proxy endpoints + key, device targets, shared staging endpoints.
//   project committed (shareable, no secrets):   <repo>/.mobileship.json
//     repo type, build/test/qa commands, branch prefix, channel type.
//   project local (env, NEVER committed):         <repo>/.mobileship.local.json
//     backend/Supabase URLs, machine/device overrides, chat id, anything environment-specific.
// Commands: probe | init [dir] [--preset <name>] | show

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

function mergeJson(path, defaults) {
  const current = readJson(path) ?? {};
  writeJson(path, deepMerge(defaults, current));
}

function deepMerge(base, override) {
  if (!isObject(base) || !isObject(override)) return override ?? base;
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = isObject(value) && isObject(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out;
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

async function reachableOpenAI(url, apiKey, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const res = await fetch(`${url.replace(/\/$/, "")}/models`, { headers, signal: controller.signal });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: err.name || "error" };
  } finally {
    clearTimeout(timer);
  }
}

async function httpOk(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: err.name || "error" };
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

function cmdVersion(cmd) {
  try {
    return execSync(`${cmd} --version`, { encoding: "utf8" }).trim().split("\n")[0];
  } catch {
    return "?";
  }
}

function shellOut(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (err) {
    return (err.stdout?.toString() || err.stderr?.toString() || "").trim();
  }
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

async function probe() {
  const machine = readJson(MACHINE_PATH);
  const project = readJson(resolve(PROJECT_FILE));
  const local = readJson(resolve(PROJECT_LOCAL_FILE));
  const engine = project?.engine?.tool || machine?.engine?.tool || machine?.engine || "droid";
  const line = (ok, label, detail = "") => `  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`;

  console.log(`mobile-autoship probe — ${platform()} @ ${homedir()}`);
  console.log(`machine config: ${existsSync(MACHINE_PATH) ? MACHINE_PATH : "(none — run the mobile-setup skill)"}`);
  console.log(`project config: ${existsSync(resolve(PROJECT_FILE)) ? resolve(PROJECT_FILE) : "(none in cwd)"}`);
  console.log(`project local: ${existsSync(resolve(PROJECT_LOCAL_FILE)) ? resolve(PROJECT_LOCAL_FILE) : "(none in cwd)"}`);

  console.log("\nengine:");
  console.log(line(engine === "hermes" || has("hermes"), "Hermes Agent", engine === "hermes" ? "selected" : has("hermes") ? "available" : "not selected"));
  console.log(line(has("droid"), "droid CLI", has("droid") ? cmdVersion("droid") : engine === "droid" ? "missing; required for engine.tool=droid" : "optional"));
  console.log(line(has("opencode"), "opencode CLI", has("opencode") ? cmdVersion("opencode") : "optional"));
  console.log(line(has("claude"), "claude CLI", has("claude") ? cmdVersion("claude") : "optional"));
  console.log(line(has("codex"), "codex CLI", has("codex") ? cmdVersion("codex") : "optional"));

  console.log("\nproxy endpoints:");
  const endpoints = machine?.proxy?.endpoints ?? [];
  if (endpoints.length === 0) console.log(engine === "hermes" ? "  - none configured (fine for engine.tool=hermes)" : "  ✗ none configured");
  for (const ep of endpoints) {
    const result = await reachableOpenAI(ep, machine?.proxy?.apiKey);
    console.log(line(result.ok, ep, result.ok ? "serving /models" : `unreachable (${result.status})`));
  }

  console.log("\ndevice / QA targets:");
  const isMac = platform() === "darwin";
  console.log(line(isMac && has("xcrun"), "iOS simulator (local)", isMac ? "" : "macOS only"));
  console.log(line(has("adb"), "adb (local Android)", has("adb") ? "available" : "missing"));
  if (has("adb")) console.log(shellOut("adb devices -l") || "(adb returned no devices)");
  const android = local?.deviceOverrides?.android ?? machine?.devices?.android;
  if (android?.url) {
    const result = await reachableOpenAI(android.url, android.apiKey);
    console.log(line(result.ok, `Android emulator MCP (${android.url})`, result.ok ? "reachable" : `unreachable (${result.status})`));
  } else if (android?.type === "adb" || android?.serial || android?.defaultSerial) {
    console.log(line(true, "Android target via adb", android.serial || android.defaultSerial || "configured"));
  } else {
    console.log("  ✗ Android target — not configured");
  }
  const figma = machine?.devices?.figma;
  if (figma) console.log(line(isMac && figma.enabled !== false, "Figma MCP bridge", isMac ? "configured" : "macOS only — ignored on this box"));

  console.log("\nbackend:");
  const backendUrls = [local?.backendUrl, local?.backendUrlTailscale, machine?.staging?.backendUrlLan, machine?.staging?.backendUrlTailscale].filter(Boolean);
  const backendHealthPath = local?.healthPath || machine?.staging?.healthPath || project?.qa?.healthPath || "/health";
  if (!backendUrls.length) console.log("  - none configured");
  for (const base of [...new Set(backendUrls)]) {
    const health = `${base.replace(/\/$/, "")}${backendHealthPath.startsWith("/") ? backendHealthPath : `/${backendHealthPath}`}`;
    const result = await httpOk(health);
    console.log(line(result.ok, health, String(result.status)));
  }

  console.log("\nsupabase:");
  const supabaseUrls = [local?.supabaseUrl, local?.supabaseUrlTailscale, machine?.staging?.supabaseUrlLan, machine?.staging?.supabaseUrlTailscale].filter(Boolean);
  const supabaseHealthPath = local?.supabaseHealthPath || machine?.staging?.supabaseHealthPath || "/auth/v1/health";
  if (!supabaseUrls.length) console.log("  - none configured");
  for (const base of [...new Set(supabaseUrls)]) {
    const health = `${base.replace(/\/$/, "")}${supabaseHealthPath.startsWith("/") ? supabaseHealthPath : `/${supabaseHealthPath}`}`;
    const result = await httpOk(health);
    console.log(line(result.ok, health, String(result.status)));
  }
  console.log();
}

const PRESETS = {
  generic: {
    shared: {
      name: "",
      engine: { tool: "droid", model: "" },
      build: "",
      test: "",
      qa: { script: "", device: "android" },
      branchPrefix: "autoship/",
      channel: { type: "telegram" },
    },
    local: {
      backendUrl: "",
      deviceOverrides: {},
      channel: { chat: "" },
      notes: "Environment-specific + secrets. This file is gitignored — never commit it.",
    },
  },
  hermes: {
    shared: {
      name: "",
      engine: { tool: "hermes" },
      build: "",
      test: "",
      qa: { script: "", device: "android" },
      branchPrefix: "autoship/",
      channel: { type: "hermes" },
    },
    local: {
      backendUrl: "",
      supabaseUrl: "",
      deviceOverrides: {},
      notes: "Environment-specific + secrets. This file is gitignored — never commit it.",
    },
  },
  "kentra-mobile": {
    shared: {
      name: "kentra-mobile",
      type: "flutter-android",
      engine: { tool: "hermes" },
      packageName: "com.kentra.app",
      build: "flutter pub get && dart run build_runner build --delete-conflicting-outputs && flutter build apk --debug",
      apk: "build/app/outputs/flutter-apk/app-debug.apk",
      test: "flutter test",
      qa: {
        device: "android",
        defaultSerial: "emulator-5554",
        physicalPixelSerial: "100.114.162.40:5555",
        recordStart: "/home/ubuntu/record-start.sh",
        recordStopTrim: "/home/ubuntu/trim.sh",
      },
      branchPrefix: "sapoepsilon/autoship-",
      channel: { type: "hermes" },
      relatedRepos: { backend: "/home/ubuntu/kentra-backend" },
    },
    local: {
      backendUrl: "http://192.168.50.67:3001",
      backendUrlTailscale: "http://100.69.20.48:3001",
      healthPath: "/api/v1/health",
      supabaseUrl: "http://192.168.50.67:54321",
      supabaseUrlTailscale: "http://100.69.20.48:54321",
      supabaseHealthPath: "/auth/v1/health",
      deviceOverrides: {
        android: { serial: "emulator-5554" },
        physicalPixel: { serial: "100.114.162.40:5555", requiresExplicitRequest: true },
      },
      production: false,
      notes: "Local Kentra autoship config for Hermes. Never commit this file. Preserve staging DB unless user approves reset.",
    },
  },
  "kentra-backend": {
    shared: {
      name: "kentra-backend",
      type: "node-express-api",
      engine: { tool: "hermes" },
      build: "npm run lint && npm run test:unit -- --run",
      test: "npm run test:unit -- --run",
      lint: "npm run lint",
      dev: "npm run dev",
      qa: { device: "api", healthPath: "/api/v1/health" },
      branchPrefix: "sapoepsilon/autoship-",
      channel: { type: "hermes" },
      relatedRepos: { mobile: "/home/ubuntu/kentra-mobile" },
    },
    local: {
      backendUrl: "http://192.168.50.67:3001",
      backendUrlTailscale: "http://100.69.20.48:3001",
      healthPath: "/api/v1/health",
      supabaseUrl: "http://192.168.50.67:54321",
      supabaseUrlTailscale: "http://100.69.20.48:54321",
      supabaseHealthPath: "/auth/v1/health",
      production: false,
      notes: "Local Kentra backend autoship config for Hermes. Never commit this file. Preserve staging DB unless user approves reset.",
    },
  },
};

function init(dir = ".", { preset = "generic", merge = false } = {}) {
  const selected = PRESETS[preset];
  if (!selected) {
    console.error(`unknown preset ${preset}. Known presets: ${Object.keys(PRESETS).join(", ")}`);
    process.exit(1);
  }
  const committed = resolve(dir, PROJECT_FILE);
  const local = resolve(dir, PROJECT_LOCAL_FILE);
  if (existsSync(committed) && !merge) {
    console.error(`${committed} already exists — not overwriting. Pass --merge to fill missing keys.`);
    process.exit(1);
  }
  if (merge) mergeJson(committed, selected.shared);
  else writeJson(committed, selected.shared);
  if (existsSync(local) && merge) mergeJson(local, selected.local);
  else if (!existsSync(local)) writeJson(local, selected.local);
  console.log(`wrote ${committed} (commit intentionally) and ${local} (gitignored).`);
  console.log("Add '.mobileship.local.json' to the project's .gitignore.");
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

const { positional, flags } = parseArgs(process.argv.slice(2));
const cmd = positional[0];
const arg = positional[1];
if (cmd === "probe") await probe();
else if (cmd === "init") init(arg ?? ".", { preset: flags.preset ?? "generic", merge: flags.merge === true });
else if (cmd === "show") show();
else {
  console.log("usage: mobile <probe|init [dir] [--preset generic|hermes|kentra-mobile|kentra-backend] [--merge]|show>");
  process.exit(cmd ? 1 : 0);
}
