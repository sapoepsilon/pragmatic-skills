# pragmatic-skills

A Claude Code [plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) of small, sharp skills — with parallel [Codex CLI](https://github.com/openai/codex) prompts where it makes sense.

## Install (Claude Code)

```
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install pragmatic@pragmatic-skills          # the whole bundle
# or pick just what you want:
/plugin install muchotexto@pragmatic-skills
```

Claude Code namespaces plugin skills as `/<plugin>:<skill>` — so `muchotexto` becomes `/muchotexto:muchotexto`, and the bundle exposes the same skill as `/pragmatic:muchotexto`. Both are also model-invoked when the description matches.

## Install (Codex)

Codex has no marketplace concept; each skill ships a standalone prompt at `plugins/<name>/codex/<name>.md`. Copy it into your prompts dir:

```bash
SKILL=muchotexto
mkdir -p ~/.codex/prompts
cp plugins/$SKILL/codex/$SKILL.md ~/.codex/prompts/$SKILL.md
```

Then invoke as `/muchotexto` in Codex.

## Install (Hermes Agent)

Hermes does not use the Claude Code marketplace format directly, but compatible skills can be copied into `~/.hermes/skills/`.

The mobile plugin includes a Hermes installer:

```bash
git clone https://github.com/sapoepsilon/pragmatic-skills
cd pragmatic-skills
node plugins/mobile/hermes/install.mjs
```

That installs the mobile stage skills under `~/.hermes/skills/pragmatic-skills/` and the helper CLI as `~/.local/bin/mobile-autoship`; run `/reload-skills` in an active Hermes session, or start a new session, then ask for `mobile-setup`.

## Catalog

Auto-generated from each plugin's `.claude-plugin/plugin.json`. Submissions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

<!-- CATALOG:START -->
| Plugin | Description | Targets | Tags |
| --- | --- | --- | --- |
| [`pragmatic`](./plugins/pragmatic) | Bundle of all pragmatic-skills. Currently includes: muchotexto, vault-session (resume + save), mobile autoship, verify-to-e2e, macos-screen-recorder, loopcopy, review-fix-loop, mediator-loop. | Claude Code | `bundle` `skills` |
| [`backend-comprehensive-review`](./plugins/backend-comprehensive-review) | Multi-agent end-to-end backend/API PR review: phased orchestrator with parallel architecture, correctness, security/authorization, migrations, and test passes, real-request runtime verification against a project-configured non-prod target, and a PR-ready verdict. Auto-configures a per-repo review extension. | Claude Code, Hermes | `backend` `api` `code-review` `qa` `migrations` `e2e` `subagents` |
| [`loopcopy`](./plugins/loopcopy) | Package the work you are doing right now into one self-contained /loop command and copy it to the clipboard, ready to paste into a fresh session on any OS. | Claude Code, Codex | `loop` `clipboard` `handoff` `cron` `automation` `session` |
| [`macos-screen-recorder`](./plugins/macos-screen-recorder) | Record the macOS screen or a specific app and render it Screen-Studio-style — framed on a wallpaper/gradient background with rounded corners and optional zoom segments — using only screencapture + ffmpeg. | Claude Code | `macos` `screen-recording` `ffmpeg` `demo` `qa` |
| [`mediator-loop`](./plugins/mediator-loop) | Blind implement -> review -> fix loop between two agents that never learn of each other's existence, mediated until an independent reviewer returns APPROVED. Engine-agnostic, disconnect-proof (supervisor + draft-PR persistence), usage-limit aware. | Claude Code | `orchestration` `code-review` `agents` `loop` `mediator` `blind-review` |
| [`mobile`](./plugins/mobile) | Mobile auto-shipper. Drive a chat request through analyze -> implement -> QA -> PR on a real simulator/emulator/device. The orchestrating agent is the coder — no separate engine CLI. Includes backend/Supabase and Flutter QA setup. | Claude Code, Codex, Hermes | `mobile` `autoship` `agent` `qa` `e2e` `ci` |
| [`muchotexto`](./plugins/muchotexto) | Answer in the minimum sentences that carry the meaning. Start at one and proactively grow by +1 only when a fact, caveat, or step would otherwise be lost. | Claude Code, Codex | `brevity` `communication` `meta` `tldr` |
| [`review-fix-loop`](./plugins/review-fix-loop) | Address external review findings through a watcher -> implementer -> verifier loop with model-pinned subagents. Implementers never commit; an independent verifier attacks the merged result by execution before anything ships. | Claude Code | `code-review` `subagents` `orchestration` `verification` `pr` |
| [`vault-session`](./plugins/vault-session) | Persistent session memory for Claude Code backed by an Obsidian vault exposed through an MCP filesystem server. Provides /resume to summarize where you left off and /save to write a session log, with first-run bootstrap that registers the vault MCP on each new machine. | Claude Code | `obsidian` `vault` `memory` `session` `mcp` `resume` `save` |
<!-- CATALOG:END -->

## Repo layout

```
.claude-plugin/marketplace.json     # marketplace catalog (Claude Code reads this)
plugins/
  pragmatic/                         # bundle plugin — installs every skill
    .claude-plugin/plugin.json
    skills/<skill>/SKILL.md         # copies kept in sync with individual plugins
  <skill>/                           # one plugin per skill
    .claude-plugin/plugin.json
    skills/<skill>/SKILL.md         # canonical SKILL.md
    codex/<skill>.md                # optional Codex prompt
    README.md
schema/                              # JSON schemas for plugin.json / marketplace.json
scripts/                             # validation, catalog, bundle sync
docs/
```

## Docs

- [Skill format spec](./docs/skill-format.md) — directory layout, manifests, the bundle/individual split
- [Claude Code integration](./docs/claude-code.md) — how marketplace install + skills work
- [Codex integration](./docs/codex.md) — per-skill prompt install
- [Contributing](./CONTRIBUTING.md) — submission process, review criteria

## License

MIT. Individual plugins may declare their own license in `plugin.json`; check before redistributing.
