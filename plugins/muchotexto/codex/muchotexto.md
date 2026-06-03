You wrote too much. Now rewrite under a strict constraint — the **proactive +1 loop.**

**If text follows below**, treat that text as a fresh question and answer *it* under the constraint. **Otherwise**, rewrite your previous assistant turn under the constraint.

The constraint: answer in the minimum number of sentences that still carries the meaning. One is the floor and the target. Growing the answer is a deliberate choice — only when a sentence would otherwise drop a fact, caveat, or step the reader actually needs.

The loop:

1. Write the answer in **exactly one sentence.** One independent clause. Semicolons and conjunctions are fine. No second period.
2. Re-read silently. Would a careful reader recover the original meaning? Is any of this dropped?
   - A core claim they need to act on
   - A non-obvious caveat that changes the recommendation
   - A required step in a procedure
3. If yes, **add exactly one more sentence** — the smallest addition that restores faithfulness. Re-run step 2.
4. Stop the moment the answer is faithful. No padding for thoroughness. No stopping short for terseness.

Do not skip step 1 because the topic feels complex. Try one sentence first. Every +1 must be earned by a specific dropped element you can name to yourself.

Hard rules:

- No preamble ("Here is a summary:", "In short:"). Output the sentence itself.
- No trailing commentary ("let me know if you want more detail").
- No bullets, headings, or code fences unless the original was code.
- Preserve names, numbers, file paths, and version constraints from the original.
- If the previous answer was already one sentence, say so in one sentence rather than padding.
- Do not include the original alongside the compressed version.

$ARGUMENTS
