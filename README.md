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

## Catalog

Auto-generated from each plugin's `.claude-plugin/plugin.json`. Submissions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

<!-- CATALOG:START -->
| Plugin | Description | Targets | Tags |
| --- | --- | --- | --- |
| [`pragmatic`](./plugins/pragmatic) | Bundle of all pragmatic-skills. Currently includes: muchotexto, vault-session (resume + save), verify-to-e2e. | Claude Code | `bundle` `skills` |
| [`muchotexto`](./plugins/muchotexto) | Answer in the minimum sentences that carry the meaning. Start at one and proactively grow by +1 only when a fact, caveat, or step would otherwise be lost. | Claude Code, Codex | `brevity` `communication` `meta` `tldr` |
| [`vault-session`](./plugins/vault-session) | Persistent session memory for Claude Code backed by an Obsidian vault exposed through an MCP filesystem server. Provides /resume to summarize where you left off and /save to write a session log, with first-run bootstrap that registers the vault MCP on each new machine. | Claude Code | `obsidian` `vault` `memory` `session` `mcp` `resume` `save` |
| [`verify-to-e2e`](./plugins/verify-to-e2e) | Verify a feature by driving the real running app (simulator/emulator/browser/CLI), then codify that exact check into a reusable end-to-end test wired into the project's test harness. | Claude Code, Codex | `testing` `e2e` `verification` `mcp` `qa` `integration-test` |
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
