You just wrote too much. Now rewrite under a strict constraint.

**If text follows below**, treat that text as a fresh question and answer *it* under the constraint. **If no text follows**, rewrite your previous assistant turn under the constraint.

The constraint:

1. Write the answer in **exactly one sentence.** One independent clause. Semicolons and conjunctions are fine. No second period.
2. Re-read it silently. Ask: would a careful reader recover the original meaning? Specifically — is any core claim, non-obvious caveat, or required procedural step lost?
3. If yes, add **one** more sentence. Re-check. Repeat until faithful.
4. Stop the moment the answer is faithful. Most uses land at 1–3 sentences. Past 5 means you misunderstood what to compress — ask what to drop instead.

Hard rules:

- No preamble ("Here is a summary:", "In short:"). Output the sentence itself.
- No trailing commentary ("let me know if you want more detail").
- No bullets, headings, or code fences unless the original was code.
- Preserve names, numbers, file paths, and version constraints from the original.
- If the previous answer was already one sentence, say so in one sentence rather than padding.
- Do not include the original alongside the compressed version.

$ARGUMENTS
