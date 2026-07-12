---
name: mobile-setup
description: Set up the mobile auto-shipper on this machine and in this project, then run a preflight that proves the pipeline works against the real repo. Use when the user says "set up mobile autoship", "mobile-setup", "configure autoship here", or wants mobile, backend, Supabase, and Flutter QA wiring. Probes devices, backend/Supabase, writes config, and reports blockers. It NEVER installs anything — the developer owns the environment.
---

# mobile: setup

Configure the mobile auto-shipper and verify it works with *this* project. The orchestrating agent is the coder and uses its tools directly (`terminal`, file tools, mobile MCP tools, GitHub/Linear/Fireflies/Sentry tools) — there is no separate engine CLI to configure.

Setup checks and records; it does not install global tools or write secrets into committed files. If something is missing, say exactly what and stop — offer the install command, let the developer run it.

Run the helper CLI as `node ${CLAUDE_PLUGIN_ROOT}/bin/mobile.mjs <cmd>` inside Claude Code, or install/call the same script as `mobile-autoship` in Hermes.

## Three config tiers

| Tier | File | Committed? | Holds |
|---|---|---|---|
| Machine | `~/.config/mobile-autoship/machine.json` | **No** | device targets, shared staging endpoints |
| Project shared | `<repo>/.mobileship.json` | Yes, intentionally | repo type, build/test/QA commands, branch prefix, channel type |
| Project local | `<repo>/.mobileship.local.json` | **No** (gitignored) | backend/Supabase URLs, device serials, chat IDs, environment-specific overrides |

Never put secrets, production URLs, or personal device tokens in `.mobileship.json`.
Always add `.mobileship.local.json` to `.gitignore`.

## Tier 1 — machine

1. Run `mobile probe` / `mobile-autoship probe` to see current state.
2. Fill `~/.config/mobile-autoship/machine.json` with non-committed host facts. Generic Hermes shape:
   ```json
   {
     "devices": {
       "android": { "type": "adb", "defaultSerial": "emulator-5554", "physicalPixelSerial": "100.114.162.40:5555" },
       "figma": { "enabled": false, "note": "Figma MCP bridge is macOS-only" }
     },
     "staging": {
       "backendUrlLan": "http://192.168.50.67:3001",
       "backendUrlTailscale": "http://100.69.20.48:3001",
       "healthPath": "/api/v1/health",
       "supabaseUrlLan": "http://192.168.50.67:54321",
       "supabaseUrlTailscale": "http://100.69.20.48:54321",
       "supabaseHealthPath": "/auth/v1/health",
       "production": false,
       "resetRequiresExplicitApproval": true
     }
   }
   ```
3. Run probe again. Missing device, backend, or Supabase targets must be reported with the exact remedy (e.g. "Android emulator not running → start `emulator-5554`").

## Tier 2 — project

1. From each repo, scaffold config:
   ```bash
   mobile init --preset hermes
   # or for Kentra:
   mobile init /home/ubuntu/kentra-mobile --preset kentra-mobile
   mobile init /home/ubuntu/kentra-backend --preset kentra-backend
   ```
2. Ensure `.mobileship.local.json` is gitignored.
3. Fill `.mobileship.json` with real repo commands, not generic guesses.
4. Fill `.mobileship.local.json` with non-prod backend/Supabase URLs and device overrides.

## Tier 3 — project preflight

Before declaring setup done, prove the actual repo works:

1. **Repo state known** — branch and dirty files are reported. Do not hide existing work.
2. **Build/test works** — run the configured `build`/`test` command appropriate to the repo.
3. **Device reachable** — Android via `adb devices -l` or mobile MCP; iOS via simctl on macOS.
4. **Backend reachable and non-prod** — health endpoint succeeds and URL does not look production.
5. **Supabase reachable and non-prod** — `/auth/v1/health` or `/rest/v1/` succeeds.
6. **GitHub auth works** — `gh auth status` or equivalent is available for PR creation.

## Kentra known-good references

- Mobile repo: `/home/ubuntu/kentra-mobile`
- Backend repo: `/home/ubuntu/kentra-backend`
- Android package: `com.kentra.app`
- Flutter build: `flutter pub get && dart run build_runner build --delete-conflicting-outputs && flutter build apk --debug`
- APK: `build/app/outputs/flutter-apk/app-debug.apk`
- Backend test: `npm run test:unit -- --run`
- Backend lint: `npm run lint`
- Backend health: `GET http://192.168.50.67:3001/api/v1/health` or `GET http://100.69.20.48:3001/api/v1/health`
- Supabase: `http://192.168.50.67:54321` or `http://100.69.20.48:54321`; verify `GET /auth/v1/health` or `GET /rest/v1/`
- Emulator: `emulator-5554`
- Physical Pixel: `100.114.162.40:5555` (only when explicitly requested; always target with `adb -s`)
- Recording helpers: `/home/ubuntu/record-start.sh`, `/home/ubuntu/trim.sh`
- Staging reset, destructive: `ssh ai-proxmox 'pct exec 116 -- /opt/kentra-staging/reset.sh'`; do not run unless user approves wiping QA data.

## Guardrails

- Never run preflight or QA against production.
- Never write secrets into `.mobileship.json` — they live in `machine.json` / `.mobileship.local.json`.
- Never reset staging/Supabase without explicit approval.
- Missing precondition → report the exact missing piece and remedy; do not silently degrade from Pixel to emulator or from integrated QA to static inspection.
