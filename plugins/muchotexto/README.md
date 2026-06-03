# muchotexto

> "¡Mucho texto!" — when the answer was way longer than the question deserved.

A skill that drives an answer toward the minimum number of sentences that still carries the meaning. **One is the floor and the target.** Growing the answer is a proactive, deliberate `+1` — only when a sentence would otherwise drop a fact, caveat, or step the reader actually needs. Never pad. Never stop short.

## Two modes

1. **Compress the previous turn.** You just got a wall of text. You say `muchotexto`. The agent rewrites its last answer in one sentence (or as few as faithfulness allows).
2. **Compress the answer about to be written.** You ask a question and invoke the skill in the same breath — e.g. `/muchotexto should I use Postgres or SQLite for my notes app?`. The agent answers under the same constraint.

The skill picks mode 1 if there's a prior assistant message to compress and mode 2 otherwise.

## The proactive +1 loop (what the agent runs internally)

1. Draft in **exactly one sentence** — even if the topic feels complex. Try one first.
2. Read it. Would a careful reader recover the original meaning? Specifically — is any of this dropped?
   - A core claim the user needs to act on
   - A non-obvious caveat that changes the recommendation
   - A required step in a procedure
3. If yes: add **one** more sentence — the smallest addition that restores faithfulness. Re-run step 2.
4. Stop the moment the answer is faithful. Not before. Not after.

Every +1 must be earned by a specific dropped element the agent can name. Vague "more would be better" doesn't qualify. Most uses land at 1–3 sentences; past 5 usually means the agent misunderstood what to compress.

## Hard rules

- No preamble (`"Here is a one-sentence summary:"`)
- No trailing commentary (`"Let me know if you want more detail."`)
- No bullets, headings, or code fences (unless the original was code)
- Preserve names, numbers, file paths, and version constraints
- If the original was already one sentence, say so in one sentence rather than padding

## Install

**Claude Code** (via marketplace):

```
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install muchotexto@pragmatic-skills
```

Invoke as `/muchotexto:muchotexto`, or just say "muchotexto" / "tldr" / "too long" — the model auto-invokes when the description matches.

**Codex** (manual copy):

```bash
mkdir -p ~/.codex/prompts
cp plugins/muchotexto/codex/muchotexto.md ~/.codex/prompts/muchotexto.md
```

Then invoke as `/muchotexto` in Codex.

## Examples

**Mode 1** — compressing a five-paragraph React explanation:

> User: muchotexto
>
> Agent: The rerender bug is the unstable object literal in the dependency array, not anything `useMemo` can fix — memoize the object or lift it out of the render.

**Mode 2** — answering tight in the first place:

> User: /muchotexto Postgres or SQLite for my notes app?
>
> Agent: SQLite, unless you need concurrent writers or to host the database separately from the app.
