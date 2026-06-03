# Contributing a skill

Thanks for wanting to share a skill. This guide covers what a skill is, how to package it for both Claude Code and Codex, and how to get it merged.

## What belongs here

A skill is a focused, reusable unit of instruction — something the agent loads on demand to do a specific job well. Good candidates:

- **Workflows** — "create a conventional-commit message from staged changes," "open a PR against `main` with a templated body"
- **Domain experts** — "review a Postgres migration for online-DDL safety," "audit a Next.js page for Core Web Vitals"
- **Integrations** — "publish to Cloudflare R2," "open a Linear ticket from a TODO comment"
- **Project recipes** — "deploy this repo's `vercel.json` correctly the first time"

Not a good fit:

- One-off prompts you'd write inline (skills carry overhead — they only pay off if reused)
- Wholesale agent system prompts (those belong in `CLAUDE.md` / `AGENTS.md` in a user's repo)
- Anything that requires unreviewed network calls or hidden state

## Directory layout

Each skill is one plugin under [`plugins/`](../plugins). For a skill named `my-skill`:

```
plugins/my-skill/
├── .claude-plugin/
│   └── plugin.json          # required
├── skills/
│   └── my-skill/
│       └── SKILL.md         # required — Claude Code skill body
├── codex/
│   └── my-skill.md          # optional — Codex prompt
└── README.md                # required — install + usage
```

`my-skill` must match `^[a-z][a-z0-9-]{1,38}[a-z0-9]$`, be unique in the registry, and appear identically in three places: the plugin directory name, `plugin.json`'s `name`, and the inner `skills/<name>/` directory.

## `plugin.json` minimum

```json
{
  "name": "my-skill",
  "description": "One-line summary. Used in the catalog and for retrieval.",
  "version": "0.1.0",
  "author": { "name": "your-github-handle" },
  "license": "MIT",
  "keywords": ["tag-one", "tag-two"]
}
```

See [`docs/skill-format.md`](./docs/skill-format.md) for the full spec.

## Submitting

1. Fork the repo and create a branch: `add/<skill-name>`.
2. Add your plugin under `plugins/<skill-name>/`.
3. Add a corresponding entry to `.claude-plugin/marketplace.json`. Match `name`, `version`, and `description`.
4. Run `npm run sync` to refresh the `pragmatic` bundle with your new skill.
5. Run `npm run catalog` to update the README table.
6. Run `npm run validate` locally — schema check, file existence, bundle parity.
7. Open a PR titled `add: <skill-name> — <one-line description>`.

CI runs the same `validate` and `catalog` checks; PRs with drift fail loudly.

## Review criteria

A maintainer will look at:

- **Scope** — is the skill focused on one job?
- **Trigger clarity** — does `plugin.json`'s `description` and `SKILL.md`'s frontmatter make it obvious when the agent should invoke it?
- **Safety** — does it shell out, hit the network, or modify state? Document that in the skill's README and add appropriate warnings in the SKILL.md.
- **Portability** — if you shipped a `codex/` prompt, does it actually work in Codex? (Codex prompts are user-invoked, so they read differently than `SKILL.md`.)
- **Originality** — duplicates of existing skills get merged into the original or rejected with feedback.

## License

By contributing, you agree your plugin is licensed under the MIT License (the repo's default) unless your `plugin.json` declares a different OSI-approved license. Plugins with non-OSI licenses or "all rights reserved" won't be accepted.
