# Skill format

Each skill ships as a Claude Code plugin under `plugins/<name>/`. Codex support is optional and lives alongside, inside the same plugin directory.

## Layout

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json          # required — Claude Code plugin manifest
├── skills/
│   └── <name>/
│       └── SKILL.md         # required — the skill itself
├── codex/                   # optional — Codex prompt for the same behavior
│   └── <name>.md
└── README.md                # required — install + usage
```

Plus the bundle plugin:

```
plugins/pragmatic/
├── .claude-plugin/plugin.json
├── skills/
│   └── <skill>/SKILL.md     # mirror of each individual plugin's canonical SKILL.md
└── README.md
```

The bundle's `SKILL.md` files are **copies**, not symlinks (so Claude Code can copy the plugin cleanly into its plugin cache). They are kept in sync by `npm run sync`, and the validator fails if they drift.

## `plugin.json`

Authoritative schema: [`schema/plugin.schema.json`](../schema/plugin.schema.json). Minimum viable:

```json
{
  "name": "muchotexto",
  "description": "Compress responses to the tightest faithful length.",
  "version": "0.1.0",
  "author": { "name": "your-handle" },
  "license": "MIT",
  "keywords": ["brevity", "communication"]
}
```

`name` must match the directory name and the skill folder name inside `skills/`. Bump `version` on every change merged to `main` — Claude Code only delivers updates to users when this field changes (or when the commit SHA changes if `version` is omitted).

## `SKILL.md`

Plain Claude Code skill file. YAML frontmatter at the top:

```markdown
---
description: One-line summary. Used by the model to decide when to invoke.
---

[Skill body. Markdown. May reference other files in this skills/<name>/ directory.]
```

Do **not** include a `name` field in the frontmatter — the directory name is the skill name.

## `codex/<name>.md` (optional)

A plain markdown file matching what Codex expects: the content is injected as the user's message when they type `/<name>`. Use `$ARGUMENTS` to capture text the user typed after the slash command.

If you don't want to support Codex, omit the `codex/` directory entirely — the catalog will reflect that.

## `marketplace.json`

The top-level [`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json) lists every plugin in the registry, including the `pragmatic` bundle. New plugins must be added to this file; the validator checks every declared `source` path exists. Schema: [`schema/marketplace.schema.json`](../schema/marketplace.schema.json).

## Versioning

Follow semver:
- **Major** — breaking changes to the trigger contract or required permissions
- **Minor** — new capabilities, backward-compatible
- **Patch** — wording fixes, internal tweaks

When bumping a skill, bump the same version in both its `plugin.json` and in its marketplace entry, then run `npm run sync && npm run catalog`.
