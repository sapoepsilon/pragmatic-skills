# Contributing a skill

Thanks for wanting to share a skill. This guide covers what a skill is, how to package it, and how to get it merged.

## What belongs here

A skill is a focused, reusable unit of instruction — something the agent loads on demand to do a specific job well. Good candidates:

- **Workflows** — "create a conventional-commit message from staged changes," "open a PR against `main` with a templated body"
- **Domain experts** — "review a Postgres migration for online-DDL safety," "audit a Next.js page for Core Web Vitals"
- **Integrations** — "publish to Cloudflare R2," "open a Linear ticket from a TODO comment"
- **Project recipes** — "deploy this repo's `vercel.json` correctly the first time"

Not a good fit:

- One-off prompts you'd write inline (skills carry overhead — they only pay off if reused)
- Wholesale agent system prompts (those belong in `CLAUDE.md` / `AGENTS.md` in a user's repo)
- Anything that requires unreviewed network calls without flagging it in the manifest

## Directory layout

Each skill is one directory under [`skills/`](../skills) with this shape:

```
skills/<skill-name>/
├── manifest.yml              # required — metadata and compatibility
├── README.md                 # required — what it does, how to use it
├── claude-code/
│   └── SKILL.md              # required if compatibility.claude_code.supported
└── codex/
    └── prompt.md             # required if compatibility.codex.supported
```

`<skill-name>` must be lowercase kebab-case, match `^[a-z][a-z0-9-]{1,38}[a-z0-9]$`, and be unique in the registry.

## Manifest

The full schema lives at [`schema/skill.schema.json`](../schema/skill.schema.json). Minimum viable manifest:

```yaml
name: my-skill
description: One-line description that surfaces in the catalog.
version: 0.1.0
license: MIT
authors:
  - github: your-handle
tags:
  - git
  - workflow
compatibility:
  claude_code:
    supported: true
    entry: claude-code/SKILL.md
  codex:
    supported: true
    entry: codex/prompt.md
```

See [`docs/skill-format.md`](./docs/skill-format.md) for every field.

## Submitting

1. Fork the repo and create a branch: `add/<skill-name>`.
2. Add your skill under `skills/<skill-name>/`.
3. Run `npm run validate` locally to check your manifest against the schema. (You can also wait for CI — the same validation runs on PRs.)
4. Open a PR. The title should be `add: <skill-name> — <one-line description>`.
5. CI will validate the manifest. A maintainer reviews for fit and quality.

## Review criteria

A maintainer will look at:

- **Scope** — is the skill focused on one job?
- **Trigger clarity** — does the description make it obvious when the agent should invoke it?
- **Safety** — does it shell out, hit the network, or modify state? If so, is that documented in the README and the manifest's `permissions` field?
- **Portability** — if it claims to support both agents, does each entry file actually work in that agent's environment?
- **Originality** — duplicates of existing skills get merged into the original or rejected with feedback.

## License

By contributing, you agree your submission is licensed under the MIT License (the repo's default) unless your manifest declares a different OSI-approved license. Skills with non-OSI licenses or "all rights reserved" won't be accepted.
