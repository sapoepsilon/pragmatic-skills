# pragmatic-skills

A curated registry of skills for [Claude Code](https://claude.com/claude-code) and [OpenAI Codex CLI](https://github.com/openai/codex).

Skills are reusable, model-invocable mini-programs: a slash command, a workflow, a domain expert, a deploy recipe. This repo is a single place to discover them and a shared format so one skill can target both agents.

> [!NOTE]
> This is a registry — not a hosting platform. Each entry is a manifest pointing to skill files (in-tree or in an upstream repo). Browse the [catalog](#catalog) below or open [`skills/`](./skills) directly.

## Quick start

**Install a skill manually:**

```bash
# Claude Code: copy the skill directory into your skills folder
cp -r skills/<name>/claude-code ~/.claude/skills/<name>

# Codex: copy the prompt file into your prompts folder
cp skills/<name>/codex/prompt.md ~/.codex/prompts/<name>.md
```

**Submit a skill:** see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Why a shared format?

Claude Code skills and Codex prompts both boil down to "instructions the agent loads on demand," but the surface details differ — frontmatter conventions, install locations, trigger semantics. The [skill format spec](./docs/skill-format.md) defines a single manifest that captures the metadata once, with per-agent entry files for anything truly agent-specific.

A skill can declare support for one agent or both. The registry shows which.

## Catalog

> The catalog is empty on launch. Submissions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

<!-- CATALOG:START -->
_No skills published yet._
<!-- CATALOG:END -->

## Docs

- [Skill format spec](./docs/skill-format.md) — the shared manifest and directory layout
- [Claude Code integration](./docs/claude-code.md) — how skills load in Claude Code
- [Codex integration](./docs/codex.md) — how skills load in Codex CLI
- [Contributing](./CONTRIBUTING.md) — submission process, review criteria

## License

MIT. Individual skills may declare their own license in their manifest; check before redistributing.
