---
name: mobile-setup
description: Set up the mobile auto-shipper on this machine and in this project, and run a preflight that proves the whole pipeline works against the project that's actually here. Use when the user says "set up mobile autoship", "mobile-setup", "configure autoship here", or onboards a new machine/repo. Probes the environment (proxy, Droid, simulators, MCPs), writes config, and reports what's missing. It NEVER installs anything — the developer owns the environment.
---

# mobile: setup

Configure the mobile auto-shipper and verify it works with *this* project. Autoship **assumes** the environment (proxy, Droid, emulators, MCPs) is already installed by the developer. This skill only **checks** and **records** — if something is missing, say exactly what and stop. Offer the install command; let the developer run it.

Run the CLI as `node ${CLAUDE_PLUGIN_ROOT}/bin/mobile.mjs <cmd>`.

## Three config tiers (keep secrets and environment OUT of git)

| Tier | File | Committed? | Holds |
|---|---|---|---|
| Machine | `~/.config/mobile-autoship/machine.json` | **No** | proxy endpoints + key, device targets (iOS sim, Android MCP, Figma MCP) |
| Project (shared) | `<repo>/.mobileship.json` | Yes | build cmd, qa script, channel type, branch prefix |
| Project (env) | `<repo>/.mobileship.local.json` | **No** (gitignored) | backend URL, device overrides, chat id, anything environment-specific |

The split exists because the environment is per-developer: laptop comes and goes, the Linux box is always on, Figma MCP only works on the Mac. None of that belongs in the repo.

## Tier 1 — machine (once per box)

1. `mobile probe` to see current state.
2. With the user, fill `machine.json`:
   ```json
   {
     "proxy": { "endpoints": ["http://localhost:8317/v1", "http://<fallback>:8317/v1"], "apiKey": "<client-key>" },
     "engine": "droid",
     "devices": {
       "android": { "type": "mcp", "url": "http://<host>:<port>" },
       "figma":   { "type": "mcp", "macOnly": true }
     }
   }
   ```
   Local proxy first if this box runs one; remote (Tailscale) as fallback. Figma MCP is Mac-only — record it but expect it ignored on Linux.
3. `mobile probe` again; every line should be ✓. Report each ✗ with its fix (e.g. "Droid missing → `brew install --cask droid`"; "proxy unreachable → start the proxy service").

## Tier 2 — project (each repo)

1. `cd` to the repo, run `mobile init` (scaffolds `.mobileship.json` + `.mobileship.local.json`).
2. Ensure `.mobileship.local.json` is gitignored (add it if not).
3. Fill in:
   - `.mobileship.json` (shared): `engine.model` (a Droid model id from `~/.factory/settings.json`), `build` command, `qa.script` + `qa.device` (`ios`/`android`), `branchPrefix`, `channel.type`.
   - `.mobileship.local.json` (env): `backendUrl`, device overrides, `channel.chat`.

## Tier 3 — project preflight (prove it works HERE)

This is the "make sure the whole thing works with the project that's in there" step. Before declaring setup done, verify against the actual repo:

1. **Build works** — run the `build` command; it must succeed.
2. **A device/QA target is reachable** for `qa.device` (iOS sim booted on Mac, or the Android MCP responding).
3. **Backend reachable** at `backendUrl` and it is **not production** (refuse if the URL looks like prod).
4. **Engine reaches the proxy** — `droid exec -m <model> "reply OK"` returns.
5. **Context sources** the analyze stage will use (Linear / Fireflies / repo) are connected, or note which are absent.

Report a checklist. Only call setup complete when build + one device + backend + engine all pass. Whatever fails, tell the developer the exact remedy — do not paper over it.

## Guardrails

- Never write secrets or the proxy key into `.mobileship.json` (it gets committed) — they live in `machine.json` / `.mobileship.local.json`.
- Never run preflight/QA against a production backend.
- Missing precondition → ask first, offer the command, let the developer run it.
