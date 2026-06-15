---
description: Answer in the minimum number of sentences that still carries the meaning. Start at exactly one and proactively grow by +1 whenever a fact, caveat, or required step would otherwise be lost — never pad, never stop short. Use when the user says "muchotexto", "mucho texto", "tldr", "too long", "shorter", "tighter", "one sentence", or otherwise signals brevity, either to compress the previous response or to get a tight first-time answer to a new question.
---

# muchotexto

Answer in **the minimum number of sentences that still carries the meaning.** One is the floor and the target. Growing the answer is a deliberate, proactive choice — only when a sentence would otherwise drop a fact, caveat, or step the user actually needs.

The philosophy: brevity by default, growth by necessity. Never pad to look thorough. Never stop short to look terse.

## Which response to compress

Two modes — pick based on the conversation:

1. **Compress the previous turn.** The user just got a long answer from you and now says `muchotexto` (or similar) with no new question attached. Rewrite *your previous assistant message* under the constraint.
2. **Compress the answer about to be written.** The user attached a new question to the trigger (e.g. "muchotexto, should I use X or Y?"). Answer *that question* under the constraint.

If both signals are present (there is a prior assistant turn *and* the current message contains a new question), mode 2 wins — answer the new question. If neither is clear, default to mode 1.

## The procedure (proactive +1 loop)

Run this loop silently. Do not narrate it. Do not show drafts.

1. Write the answer in **exactly one sentence.** One independent clause. Semicolons and conjunctions are fine. No second period.
2. Re-read it. Ask: would a careful reader recover the original meaning? Specifically — is anything load-bearing dropped?
   - A core claim the user needs to act on
   - A non-obvious caveat that changes the recommendation
   - A required step in a procedure (any step the user would get wrong without it)
3. If yes to any: **add exactly one more sentence** — the smallest addition that restores faithfulness. Re-run step 2.
4. Stop the moment the answer is faithful. The number of sentences is whatever step 3 settled on, no more.

Do not skip step 1 because the topic feels complex. Try one first. The +1 decision must be earned by a specific dropped element you can name to yourself, not a vague sense that "more would be better."

Most uses land at 1–3 sentences. If you find yourself past 5, you have probably misunderstood what to compress — stop and ask the user what they wanted dropped.

## Hard rules

- **No preamble.** Do not write "Here is a one-sentence summary:" or "In short:". Output the sentence itself.
- **No trailing commentary.** Do not append "Let me know if you want more detail." The user already invoked the skill; they will ask if they need more.
- **No bullets, no headings, no code fences** — unless the original answer was code and the compression is still code.
- **Preserve specificity.** Names, numbers, file paths, and version constraints from the original must survive into the compressed form, or be dropped only with explicit reason.
- **If the original was already one sentence**, respond with one sentence noting that ("The previous answer was already a single sentence.") rather than padding.
- **Do not include the original alongside the compressed version.** The user can scroll up.

## Examples

**Mode 1 — compress prior turn.** Previous assistant message was five paragraphs about why `useMemo` won't fix a rerender bug, identifying an inline object literal in the dependency array as the culprit.

> User: muchotexto
>
> You: The rerender bug is the unstable object literal in the dependency array, not anything `useMemo` can fix — memoize the object or lift it out of the render.

**Mode 2 — compress the new answer.**

> User: muchotexto — should I use Postgres or SQLite for my notes app?
>
> You: SQLite, unless you need concurrent writers or to host the database separately from the app.

**Faithfulness forces +1.** Previous turn explained that a Vercel deployment was failing because of a Node version mismatch *and* a missing env var.

> User: tldr
>
> You: The deploy is failing for two independent reasons — your `engines.node` pins 18 while the project targets 20, and `DATABASE_URL` is unset in the Production environment. Fix both before retrying; fixing one will surface the other as the next error.
