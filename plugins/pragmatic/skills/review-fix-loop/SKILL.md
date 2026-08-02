---
name: review-fix-loop
description: Address external review findings (PR review comments, audit reports, QA sweeps) through an orchestrated watcher → implementer → verifier loop with model-pinned subagents. Use when the user says "address these review comments", "fix what the reviewer found", pastes a review URL, or wants findings fixed with independent verification rather than a single-pass edit. The session model orchestrates and gates; Opus 5 subagents implement; an Opus 5 verifier attacks the merged result by execution before anything is committed.
---

# review-fix-loop

Fix reviewer findings through three separated roles — **watcher**, **implementers**, **verifier** — so that no finding ships on the implementer's own word. The separation exists because an implementer's tests encode the implementer's understanding: when that understanding is wrong, the tests pass anyway. Only an agent that did not write the fix can catch that class of failure.

## Roles and models

| Role | Who | Model | Why |
|---|---|---|---|
| Watcher | the main session | session model | Owns context, judgment, and the commit. Never delegates the final gate. |
| Reproducer | watcher (inline) or a subagent for big batteries | `sonnet` | Mechanical probe execution; cheap and fast. |
| Implementer(s) | one subagent per disjoint file set | `opus` | The fix is the hard reasoning step. |
| Verifier | one subagent over the merged result | `opus` | Must out-think the implementers, so never a weaker model than them. |

Pass the model explicitly on the Agent call (`model: "opus"` / `model: "sonnet"`). Do not let implementation or verification silently inherit a lighter session model.

## The loop

1. **Reproduce before dispatching.** Run every probe from the review yourself. A finding that does not reproduce gets pushed back on the reviewer with evidence, not "fixed". Findings you reproduce become ground truth in the implementer prompts — never forward a reviewer's claims unverified.

2. **Partition by file, not by finding.** Findings that touch the same file go to ONE implementer, even if conceptually separate — parallel agents editing one file corrupt each other. State each agent's owned files explicitly and name the files the *other* agent owns so neither strays.

3. **Dispatch implementers in parallel** (single message, `model: "opus"`, background). Every implementer prompt must contain: the reproduced probes with expected values, the regression contract (every previously pinned case that must keep its value — enumerate them, don't say "existing tests"), repo conventions verbatim, **DO NOT COMMIT**, and a required self-report format (decision-procedure delta, cases not satisfied, unrequested changes flagged for accept/revert).

4. **Dispatch the verifier** over the merged uncommitted tree (`model: "opus"`, read-only — "DO NOT EDIT ANY FILE"). Its brief: (a) re-execute every probe from EVERY review round, not just the current one; (b) invent new adversarial cases specifically targeting the design choices the implementers flagged in their reports; (c) run the full suite, lint, and a conventions scan of the diff; (d) confirm diff hygiene — only the owned files changed, exports only added; (e) end with SHIP / DO-NOT-SHIP and the single most important reason. Require verification **by execution** — a verifier that reads code and reports agrees with whoever wrote it.

5. **Bounce, don't patch.** If the verifier rejects, send the defect back to the owning implementer with SendMessage — its context is warm and the fix lands faster than a fresh agent or the watcher editing around it. Include the verifier's exact failing cases and the keep-passing contract. Then the watcher re-executes the failing battery personally; a full verifier round for a two-line fix is overkill, judgment for anything larger.

6. **Watcher gates, then ships.** In order: spot-check the failing battery by hand, full unit suite, lint, any domain gate the diff's surface requires (safety suites, adversarial gates), commit — one commit per implementer's surface, message states the constraint not the story — push, deploy, live-verify the original probes against the running system, reply to the reviewer.

## Invariants (each one was learned by paying for it)

- **Implementers never commit.** The watcher reviews the diff and owns history.
- **The verifier re-runs ALL prior rounds' probes**, not just this round's. Round-N fixes regress round-N−1 probes constantly.
- **A green implementer test suite proves nothing by itself.** The verifier once rejected an implementation whose 46 tests all passed — a pinned probe used phrasing that short-circuited on a different rule and masked the defect.
- **Distinguish real defect from acceptable edge, and pre-existing from introduced.** Run ambiguous probes against the base branch before accepting a "regression" claim. Pre-existing gaps get declared to the reviewer as out of scope — never silently absorbed, never silently dropped.
- **Unrequested changes by implementers are surfaced, not buried.** The prompt's report format forces "flag for accept/revert"; the watcher decides.
- **The watcher reads the riskiest diff hunks personally** even with a verifier — verifiers verify claims; the watcher still owns "is this the right change at the right depth".

## Prompt skeletons

**Implementer (`model: "opus"`):**

```
Fix <finding set> in worktree <path>.
FILES YOU OWN: <list>. Another agent is editing <other files> concurrently — touch nothing outside your set.
DO NOT COMMIT.

## Findings (reproduced by the orchestrator — ground truth)
<probe> → currently <wrong>, must be <right>   (one line each)

## Required design
<reviewer's design direction + orchestrator's constraints>

## Regression contract
<enumerated pinned cases that must keep their values>

## Conventions
<repo rules verbatim: comments, ternaries, logging>

## Definition of done
<focused tests> green, full suite no new failures, lint clean. Iterate until green.
Report: decision-procedure delta in ≤N lines; cases you could not satisfy and why;
any unrequested change flagged for accept/revert.
```

**Verifier (`model: "opus"`):**

```
Independent verifier for <N> concurrent implementations in <worktree>.
DO NOT EDIT ANY FILE. Verify by EXECUTION — never by trusting reports or reading code alone.

## Claims to verify (not assume)
<each implementer's self-report, condensed>

Part 1 — this round's probes: <list with expected values>
Part 2 — full regression: every probe from all prior rounds: <list>
Part 3 — adversarial: invent NEW cases targeting <the design choices implementers flagged>.
         Judge each break: real defect vs acceptable edge vs pre-existing (test the base branch).
Part 4 — suite, lint, conventions scan of the diff, diff hygiene (only <owned files> changed,
         exports only added — grep consumers).

Output: verdict per part, table of breaks with judgment, final SHIP / DO-NOT-SHIP
with the single most important reason.
```

## Boundaries

This skill is for responding to a concrete set of findings from an external reviewer. For generating findings, use a review skill; for open-ended feature work, the mobile/feature pipelines. If findings span repos, run one loop per repo — one worktree per loop.
