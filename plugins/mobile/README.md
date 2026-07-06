# mobile

Mobile **auto-shipper**. Drive a chat request through **analyze → implement → QA → PR** on a real simulator/emulator. The orchestrating agent (Hermes / Claude Code) is the coder — it writes the change itself; there is no separate engine CLI.

Status: **early**. Setup + machine probe + the stage skills are in. The deterministic orchestrator (run-state, gates, channel, loop driver) lands in later slices.

## Pipeline — each stage is its own skill

```
request ─► mobile-analyze ─►(green light)─► mobile-implement ⇄ mobile-qa ─►(pass)─► SHIP (PR + install)
              │ stuck → dev        stuck → analyze    fail → implement
```

- **`mobile-analyze`** — loop over Linear / Fireflies / codebase / screenshots / any MCP context source → confirm intent with the dev.
- **`mobile-implement`** — write the change yourself on a branch until it builds and matches intent.
- **`mobile-qa`** — drive the real app on iOS sim / Android emulator MCP / adb / Figma bridge against a non-prod backend, record, verify.
- **`verify-to-e2e`** — codify a manual verification into a durable e2e test (lives here now).
- **`mobile-setup`** — per-machine + per-project config + a preflight that proves the pipeline works against *this* repo.
- **`mobile-comprehensive-review`** — multi-agent end-to-end PR review: architecture pass, diff inspection, checks, real build, on-device verification against a non-prod backend, optional recorded evidence, PR-ready verdict.

Any stage that gets stuck bounces back with a prompt: qa→implement, implement→analyze, analyze→dev.

## Assumptions (the developer owns the environment; setup only checks)

- A **device target**: iOS simulator (macOS) and/or an Android emulator-control MCP. Optionally the Figma MCP bridge (macOS only).
- A **non-prod backend** with migrations applied for QA to drive against.

Missing anything → `mobile-setup` tells you what to install; it never installs for you.

## Config (secrets + environment never committed)

| File | Committed | Holds |
|---|---|---|
| `~/.config/mobile-autoship/machine.json` | no | device targets |
| `<repo>/.mobileship.json` | yes | build cmd, qa script, channel type, branch prefix |
| `<repo>/.mobileship.local.json` | **no** (gitignore) | backend URL, device overrides, chat id |

```bash
node bin/mobile.mjs probe   # what can this machine do?
node bin/mobile.mjs init    # scaffold project config in the current repo
node bin/mobile.mjs show    # dump machine + project config
```
