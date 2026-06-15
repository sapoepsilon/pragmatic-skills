# verify-to-e2e

> First prove the feature works by driving the real app. Then make that proof permanent.

A skill for the loop you keep doing by hand: an agent drives a simulator / emulator /
browser to **verify** a new feature works, and once it does, you want that same check as a
**durable end-to-end test** instead of a one-off manual walkthrough. This skill runs both
halves — verify, then codify — for any stack (mobile, web, desktop, backend).

## Two phases

1. **Verify** — pin down concrete acceptance criteria, then drive the real running system
   (iOS sim, Android emulator, browser, CLI, API) via MCP or the project's automation,
   observing every step until the end state matches. Fix the code first if it misbehaves.
2. **Codify** — discover the project's existing test conventions, write an E2E/integration
   test that asserts the *same* observable outcomes, wire it into the runner, and run it
   until green (then once more to catch flakiness).

It bakes in the hard-won lessons: authenticate via the project's test helper (never type
real passwords into login fields), scope error-swallowing so a routing test doesn't die on a
layout warning, recognize perpetual-spinner / `setState`-after-dispose / `mounted` bugs the
test surfaces, warm flaky cold backends and add a retry, cold-restart degraded emulators, and
clean up ephemeral test state.

> Recording the run (video/GIF) is intentionally **out of scope** — pair it with a separate
> recording skill if you want a clip.

## Install

**Claude Code** (via marketplace):

```
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install verify-to-e2e@pragmatic-skills
```

Invoke as `/verify-to-e2e:verify-to-e2e`, or just ask the agent to "verify this feature in
the simulator and then write an e2e test for it" — the model auto-invokes when the
description matches.

## Safety

This skill drives the real app and shells out (build tools, `adb`/`simctl`, test runners) and
may hit the project's backend with a test account. It never types real credentials into login
fields and never records the run. It can create/delete **ephemeral test users** as part of the
flow — it cleans those up, but review the test account / env it targets before running against
anything shared.
