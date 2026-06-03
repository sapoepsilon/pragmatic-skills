# Claude Code integration

Claude Code loads skills from `~/.claude/skills/<name>/SKILL.md` (user-level) or `<project>/.claude/skills/<name>/SKILL.md` (project-level). Plugin-installed skills appear under `~/.claude/plugins/<plugin>/skills/<name>/`.

## Installing a skill from this registry

Pick a skill from [`skills/`](../skills), then copy the Claude Code entry directory:

```bash
SKILL=my-skill
mkdir -p ~/.claude/skills/$SKILL
cp -R skills/$SKILL/claude-code/* ~/.claude/skills/$SKILL/
```

Restart Claude Code (or run `/help` to confirm the skill appears in the list).

## How invocation works

Claude Code surfaces installed skills in its system prompt and invokes them via its `Skill` tool when the user's request matches the skill's `description` and `trigger_keywords`. Skills are not auto-executing — they're advisory instructions the agent loads when relevant.

## Authoring tips

- **Write the description for retrieval, not branding.** The model picks skills by matching the user's intent to the description. "Create a conventional-commit message from staged changes" beats "MyTool: the best commit helper."
- **Front-load triggers.** Mention the verbs/nouns a user would actually say.
- **Keep `SKILL.md` short.** Long skills get diluted in context. If you need detail, put it in a sibling file (`reference.md`) and reference it conditionally from `SKILL.md`.
- **Test in a real session.** Install the skill, ask the agent something it should trigger on, and check whether it picks the skill up.

## Plugin skills vs. user skills

This registry distributes plain user skills — drop-in directories, no plugin manifest. If you want your skill bundled with hooks, slash commands, and MCP servers, publish it as a [Claude Code plugin](https://claude.com/claude-code) separately and link to it from your skill's `repository` field.
