# review-fix-loop

A reviewer left you findings. The tempting move is to fix them in one pass and reply. The problem with one pass is structural: **an implementer's tests encode the implementer's understanding.** When that understanding is wrong, the tests pass anyway.

So this skill splits the work into three roles that don't trust each other.

| Role | Who | Model |
|---|---|---|
| Watcher | the main session | session model |
| Reproducer | inline, or a subagent for big batteries | `sonnet` |
| Implementer(s) | one per disjoint file set | `opus` |
| Verifier | one, over the merged result | `opus` |

The verifier is never a weaker model than the implementers — it has to out-think them.

## The loop

1. **Reproduce before dispatching.** A finding that doesn't reproduce gets pushed back on the reviewer with evidence, not "fixed". What you reproduce becomes ground truth in the implementer prompts.
2. **Partition by file, not by finding.** Two agents editing one file corrupt each other. Each agent is told which files it owns *and* which files the others own.
3. **Implementers run in parallel and never commit.** Their prompts carry the reproduced probes, an enumerated regression contract, repo conventions verbatim, and a required self-report format.
4. **The verifier is read-only and verifies by execution.** It re-runs every probe from *every* prior round, invents adversarial cases against the design choices the implementers flagged, checks diff hygiene, and ends with SHIP / DO-NOT-SHIP.
5. **Bounce, don't patch.** A rejected fix goes back to the implementer that wrote it — its context is warm.
6. **The watcher gates and ships.** Spot-check, suite, lint, domain gates, commit per surface, push, live-verify, reply to the reviewer.

## Invariants that were learned the expensive way

- The verifier once rejected an implementation whose **46 tests all passed** — a pinned probe used phrasing that short-circuited on a different rule and masked the defect.
- Round-N fixes regress round-N−1 probes constantly, which is why the verifier re-runs everything.
- Run ambiguous probes against the base branch before accepting a "regression" claim; pre-existing gaps get declared to the reviewer, never silently absorbed.
- Unrequested changes are surfaced for accept/revert, never buried.

## Use it

```
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install review-fix-loop@pragmatic-skills
```

Invoke as `/review-fix-loop:review-fix-loop`, or `/pragmatic:review-fix-loop` from the bundle. It also auto-invokes when you paste a review URL or say "address these review comments".

## Boundaries

For responding to a concrete set of findings from an external reviewer. To *generate* findings, use a review skill; for open-ended feature work, the mobile pipelines. Findings spanning repos get one loop per repo, one worktree per loop.
