# muchotexto

> "¡Mucho texto!" — when the answer was way longer than the question deserved.

A skill that forces an answer down to the tightest faithful length: **exactly one sentence**, with permission to add another sentence only when meaning would otherwise be lost. Then another. The ceiling is whatever it takes to be honest; the floor is one.

## Two modes

1. **Compress the previous turn.** You just got a wall of text. You say `muchotexto`. The agent rewrites its last answer in one sentence (or as few as faithfulness allows).
2. **Compress the answer about to be written.** You ask a question and invoke the skill in the same breath — e.g. `/muchotexto should I use Postgres or SQLite for my notes app?`. The agent answers under the same constraint.

The skill picks mode 1 if there's a prior assistant message to compress and mode 2 otherwise.

## The procedure (what the agent runs internally)

1. Draft in **exactly one sentence**.
2. Read it. Would a careful reader recover the original meaning? Specifically — is any of this dropped?
   - A core claim the user needs to act on
   - A non-obvious caveat that changes the recommendation
   - A required step in a procedure
3. If yes: add **one** more sentence. Re-check.
4. Stop the moment the answer is faithful.

Most uses should land at 1–3 sentences. Past 5 usually means the agent misunderstood what to compress.

## Hard rules

- No preamble (`"Here is a one-sentence summary:"`)
- No trailing commentary (`"Let me know if you want more detail."`)
- No bullets, headings, or code fences (unless the original was code)
- Preserve names, numbers, file paths, and version constraints
- If the original was already one sentence, say so in one sentence rather than padding

## Install

**Claude Code:**

```bash
mkdir -p ~/.claude/skills/muchotexto
cp -R skills/muchotexto/claude-code/* ~/.claude/skills/muchotexto/
```

**Codex:**

```bash
mkdir -p ~/.codex/prompts
cp skills/muchotexto/codex/prompt.md ~/.codex/prompts/muchotexto.md
```

## Examples

**Mode 1** — compressing a five-paragraph React explanation:

> User: muchotexto
>
> Agent: The rerender bug is the unstable object literal in the dependency array, not anything `useMemo` can fix — memoize the object or lift it out of the render.

**Mode 2** — answering tight in the first place:

> User: /muchotexto Postgres or SQLite for my notes app?
>
> Agent: SQLite, unless you need concurrent writers or to host the database separately from the app.
