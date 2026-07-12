# mobile

Mobile **auto-shipper**. Drive a chat request through **analyze → implement → QA → PR** on a real simulator/emulator/device, with config split so machine secrets and environment details never land in git.

The orchestrating agent (Hermes / Claude Code) **is the coder** — it writes the change itself with its normal terminal/file/mobile/browser/GitHub/Linear/Fireflies/Sentry tools. There is no separate engine CLI, no subscription proxy.

Status: **early but usable for setup/preflight**. Setup + machine/project probe + the stage skills are in. The deterministic orchestrator (run-state, gates, channel, loop driver) is still landing in slices, so today the skills guide the agent and the helper CLI records/verifies config.

## Install in Hermes Agent

From a checkout of this repo:

```bash
node plugins/mobile/hermes/install.mjs
```

That copies the mobile skills into `~/.hermes/skills/pragmatic-skills/` and installs the helper CLI as `~/.local/bin/mobile-autoship`. In an already-running Hermes session, run `/reload-skills` after install; otherwise start a new session and ask for `mobile-setup`.


## Pipeline — each stage is its own skill

```
request ─► mobile-analyze ─►(green light)─► mobile-implement ⇄ mobile-qa ─►(pass)─► SHIP (PR + install)
              │ stuck → dev        stuck → analyze    fail → implement
```

- **`mobile-analyze`** — loop over Linear / Fireflies / GitHub / codebase / screenshots / Sentry / any MCP context source → confirm intent with the dev.
- **`mobile-implement`** — write the change yourself on the exact branch; build/test until green.
- **`mobile-qa`** — drive the real app/API on iOS sim / Android emulator / physical device / adb / browser / terminal against a non-prod backend; record evidence where possible.
- **`verify-to-e2e`** — codify a manual verification into a durable e2e test.
- **`mobile-setup`** — per-machine + per-project config + a preflight that proves the pipeline works against *this* repo.
- **`mobile-comprehensive-review`** — multi-agent end-to-end PR review: architecture pass, diff inspection, checks, real build, on-device verification against a non-prod backend, optional recorded evidence, PR-ready verdict.

Any stage that gets stuck bounces back with a prompt: qa→implement, implement→analyze, analyze→dev.

## Config (secrets + environment never committed)

| File | Committed | Holds |
|---|---|---|
| `~/.config/mobile-autoship/machine.json` | no | device targets, shared staging endpoints |
| `<repo>/.mobileship.json` | yes, intentionally | repo type, build/test/QA commands, branch prefix, channel type |
| `<repo>/.mobileship.local.json` | **no** (gitignore) | backend/Supabase URLs, device overrides, chat id, environment-specific notes |

```bash
node bin/mobile.mjs probe                         # what can this machine + current repo do?
node bin/mobile.mjs init --preset hermes          # scaffold generic Hermes project config
node bin/mobile.mjs init --preset kentra-mobile   # scaffold Kentra Flutter Android config
node bin/mobile.mjs init --preset kentra-backend  # scaffold Kentra backend/API config
node bin/mobile.mjs show                          # dump machine + current project config
```

If a project already has `.mobileship.json`, use `--merge` to fill missing keys without overwriting existing choices:

```bash
node bin/mobile.mjs init --preset hermes --merge
```

## Example: Hermes + Flutter mobile + backend + Supabase QA

Machine config (`~/.config/mobile-autoship/machine.json`):

```json
{
  "devices": {
    "android": { "type": "adb", "defaultSerial": "emulator-5554", "packageName": "com.example.app" }
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

Project shared config (`.mobileship.json`) should hold only reusable commands:

```json
{
  "build": "flutter pub get && dart run build_runner build --delete-conflicting-outputs && flutter build apk --debug",
  "test": "flutter test",
  "qa": { "device": "android", "defaultSerial": "emulator-5554" },
  "branchPrefix": "autoship/",
  "channel": { "type": "hermes" }
}
```

Project local config (`.mobileship.local.json`) should hold the real non-prod URLs and device serials, and must be gitignored.

## Kentra presets

The helper includes concrete presets for the Kentra Health setup used to validate Hermes compatibility:

- `kentra-mobile` — Flutter Android repo, package `com.kentra.app`, APK path `build/app/outputs/flutter-apk/app-debug.apk`, emulator `emulator-5554`, physical Pixel `100.114.162.40:5555`, recording helpers `/home/ubuntu/record-start.sh` and `/home/ubuntu/trim.sh`.
- `kentra-backend` — Node/Express backend with `npm run lint`, `npm run test:unit -- --run`, API health at `/api/v1/health`, and non-prod Supabase verification at `/auth/v1/health` or `/rest/v1/`.

The Kentra staging reset command is intentionally treated as destructive and requires explicit approval before use.
