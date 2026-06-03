# Codex integration

[Codex CLI](https://github.com/openai/codex) loads user prompts from `~/.codex/prompts/`. Each `.md` file becomes a slash command — `~/.codex/prompts/muchotexto.md` is invoked as `/muchotexto`.

Codex has no marketplace concept, so pragmatic-skills ships per-skill prompts alongside the Claude Code plugin files. Install by copying the file.

## Install

```bash
SKILL=muchotexto
mkdir -p ~/.codex/prompts
cp plugins/$SKILL/codex/$SKILL.md ~/.codex/prompts/$SKILL.md
```

Restart Codex, then type `/` to confirm the slash command appears.

## Where the file lives

Each plugin that supports Codex has a `codex/<name>.md` file:

```
plugins/muchotexto/
├── .claude-plugin/plugin.json
├── skills/muchotexto/SKILL.md     # Claude Code
└── codex/muchotexto.md            # Codex
```

If a plugin has no `codex/` directory, it doesn't support Codex.

## How invocation works

Unlike Claude Code skills (model-invoked by description), Codex prompts are **user-invoked slash commands.** The user types `/muchotexto` (optionally with arguments) and the contents of the prompt file are injected as the user's message.

This means the Codex `.md` should be written from the user's perspective — phrasing the request the agent will receive — rather than instructing the agent in the third person. `$ARGUMENTS` captures whatever the user typed after the slash command.

## Keeping Claude Code and Codex versions in sync

The Claude Code `SKILL.md` and the Codex `prompt.md` cover the same behavior with different framing. When you update one, update the other and bump the plugin version. There is no auto-sync between the two — the framing genuinely differs (agent-facing vs. user-facing).
