# Skill format

A single manifest plus per-agent entry files. The manifest captures everything an installer needs to know; the entry files are whatever the target agent expects (Claude Code's `SKILL.md`, Codex's prompt markdown).

## Layout

```
skills/<name>/
├── manifest.yml
├── README.md
├── claude-code/
│   ├── SKILL.md
│   └── …                    # extra files the skill loads (scripts, templates, refs)
└── codex/
    └── prompt.md
```

A skill that only targets one agent omits the other directory and sets `supported: false` (or omits the agent entirely) in the manifest.

## Manifest schema

The authoritative definition is [`schema/skill.schema.json`](../schema/skill.schema.json). Annotated example:

```yaml
# Required
name: my-skill                       # kebab-case, unique
description: |
  One-line summary that the agent uses to decide when to invoke the skill.
  Keep it specific — include trigger conditions ("when the user asks to commit",
  "after editing a TSX file").
version: 0.1.0                       # semver
license: MIT                         # SPDX identifier

authors:
  - github: your-handle              # at least one author required
    name: Your Name                  # optional
    email: you@example.com           # optional

# Optional but strongly encouraged
tags:                                # used for catalog filtering
  - git
  - workflow
trigger_keywords:                    # phrases the user might say
  - commit
  - save changes
homepage: https://example.com/skill  # optional
repository: https://github.com/...   # optional, if the skill lives upstream

# Required: declare which agents the skill targets
compatibility:
  claude_code:
    supported: true
    entry: claude-code/SKILL.md      # path relative to skill directory
    install_to: ~/.claude/skills/{name}/   # default for Claude Code, can override
  codex:
    supported: true
    entry: codex/prompt.md
    install_to: ~/.codex/prompts/{name}.md

# Optional — surface risk to the installer
permissions:
  network: false                     # does the skill make network calls?
  filesystem_write: true             # does it write outside its install dir?
  shell: true                        # does it invoke shell commands?
  notes: |
    Runs `git` commands and writes to the current working directory only.
```

## Per-agent entries

### `claude-code/SKILL.md`

A Claude Code skill markdown file with YAML frontmatter. The `name` and `description` fields **must** match the manifest. Example:

```markdown
---
name: my-skill
description: One-line summary that surfaces in the agent's skill list.
---

[Instructions for the agent. Markdown. May reference other files in this directory.]
```

Anything else in `claude-code/` (scripts, templates) is copied alongside `SKILL.md` when installed.

### `codex/prompt.md`

A Codex prompt file. Codex treats the filename as the slash command, so a skill named `my-skill` becomes `/my-skill`. The file is plain markdown — no frontmatter required.

```markdown
[Instructions for the agent, in the form the user would expect when they type the slash command.]
```

If you need the same content in both agents, it's fine to have `codex/prompt.md` source from `../claude-code/SKILL.md` via a build step — but the file must exist when the manifest claims `supported: true`.

## Versioning

Follow semver:
- **Major** — breaking changes to the trigger contract or required permissions
- **Minor** — new capabilities, backward-compatible
- **Patch** — wording fixes, internal tweaks

Bump the version on every change merged to `main`.
