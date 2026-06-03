# Codex integration

OpenAI's [Codex CLI](https://github.com/openai/codex) loads user-defined prompts from `~/.codex/prompts/`. Each `.md` file in that directory becomes a slash command — `~/.codex/prompts/my-skill.md` is invoked as `/my-skill`.

## Installing a skill from this registry

```bash
SKILL=my-skill
mkdir -p ~/.codex/prompts
cp skills/$SKILL/codex/prompt.md ~/.codex/prompts/$SKILL.md
```

Restart Codex, then type `/` to confirm the slash command appears.

## How invocation works

Unlike Claude Code skills (which the agent invokes autonomously when the description matches), Codex prompts are **user-invoked slash commands**. The user types `/my-skill` (optionally with arguments) and the content of the prompt file is injected into the conversation as the user's message.

This means a Codex prompt should be written from the user's perspective — phrasing the request the agent will receive — rather than as instructions to the agent in the third person.

## Authoring tips

- **Make the prompt self-contained.** The user types `/my-skill` and that's the entire message; the prompt must include all context the agent needs.
- **Support arguments via `$ARGUMENTS`.** Codex substitutes `$ARGUMENTS` with whatever the user typed after the slash command, e.g. `/my-skill some text`.
- **Don't rely on hidden state.** A Codex prompt has no frontmatter, no triggers, no `description` retrieval — it runs only when the user explicitly invokes it.

## Sharing logic between Claude Code and Codex

When a skill targets both agents, the two entry files often share most content with different framing — Claude Code's `SKILL.md` is written *to* the agent, Codex's `prompt.md` is written *as* the user. Keep them in sync by editing both when behavior changes, and bump the manifest `version`.

If the agent-vs-user framing is the only difference, you can use a small build script to derive one from the other, but committing both files (so installers can copy directly) is the canonical state.
