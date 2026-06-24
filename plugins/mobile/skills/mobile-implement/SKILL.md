---
description: Stage 2 of the mobile auto-shipper — implement. Loop the headless agent (Droid) to build the confirmed change on a branch until it compiles and matches intent, then hand off to QA. Use after mobile-analyze has a green-lit intent, or when mobile-qa bounces a failure back here to fix.
---

# mobile: implement (stage 2 of 3)

Goal: realize the **confirmed intent** from stage 1 as working, building code on a dedicated branch, then hand to QA. This stage drives the engine (`droid exec`); it does not decide *what* to build — that came from analyze.

## Loop

1. Ensure a branch exists: `<branchPrefix><short-slug>` (from `.mobileship.json`). Never work on the default branch.
2. Drive the engine with the intent:
   ```
   droid exec -m <engine.model> --auto medium "<intent + acceptance from run-state>"
   ```
   Use the model from `.mobileship.json` (a proxy model — runs on the subscription). Stream output; relay progress to the channel.
3. **Build** with the project's `build` command. If it fails, feed the error back to the engine and loop.
4. Repeat until: build passes **and** the diff plausibly satisfies the confirmed intent.
5. Respect the loop budget (max iterations / cost) — if exceeded, bounce, don't spin forever.

## Handoff contract

- **Build green + intent satisfied** → record the branch + diff summary in run-state, hand off to `mobile-qa`.
- **QA bounced a failure here** → read the QA report from run-state, fix specifically that, re-run the build, hand back to `mobile-qa`.
- **Cannot proceed** (the intent is wrong/underspecified, or a decision is needed that isn't yours) → bounce **back to `mobile-analyze`** with a prompt: *"Implementing this surfaced [X] — the intent needs [decision]; sending back to analyze."* Stage 1 will re-confirm with the dev.

Always leave run-state updated (branch, iterations, build status, what changed) so QA and any bounce-back have the full picture.
