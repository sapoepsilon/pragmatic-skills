# Claude Code integration

This repo is a Claude Code [plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces). Add it once, then install individual plugins or the bundle.

## Install

```
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install pragmatic@pragmatic-skills
```

Or, for a single skill:

```
/plugin install muchotexto@pragmatic-skills
```

After install, Claude Code copies the plugin into its cache at `~/.claude/plugins/cache/`. Updates arrive automatically; you can force a refresh with `/plugin marketplace update`.

## How invocation works

Skills inside a plugin are **namespaced** as `/<plugin>:<skill>`. So:

- `muchotexto` plugin → `/muchotexto:muchotexto`
- `pragmatic` bundle → `/pragmatic:muchotexto`, `/pragmatic:<other-skill>`, ...

Skills are also model-invoked when the user's intent matches the `description` field in `SKILL.md` — no slash command needed. The bundle and the individual plugin both expose the same skill content; install whichever you prefer, but **don't install both** — Claude Code will warn about the duplicate skill name.

## Bundle vs. individual

| Want                        | Install                                   |
| --------------------------- | ----------------------------------------- |
| Everything in this registry | `pragmatic@pragmatic-skills`              |
| A specific skill            | `<skill-name>@pragmatic-skills`           |
| A subset of two or three    | Multiple individual plugins               |

The bundle is mostly a convenience — it's the same SKILL.md files re-shipped under one plugin namespace.

## Authoring tips

- **Write the `description` for retrieval, not branding.** The model picks skills by matching user intent to the description. Be specific about triggers.
- **Don't put a `name` field in the SKILL.md frontmatter.** The directory name is the skill name; an extra `name` is redundant.
- **Keep `SKILL.md` short.** Push details into sibling files in the same `skills/<name>/` directory and reference them conditionally.
- **Test with `--plugin-dir` before submitting.** `claude --plugin-dir ./plugins/<name>` loads your plugin without going through the marketplace install path.

For the broader Claude Code skill authoring guide, see [docs.claude.com → Skills](https://code.claude.com/docs/en/skills).
