# mediator-loop

Two agents. One writes code, one audits it. **Neither knows the other exists** — and the loop between them runs until the auditor says APPROVED, not until anyone gets tired.

You (or your agent) sit in the middle as the mediator: relaying findings one way and diffs the other, stripping every hint of tool names, model names, or agent identity in both directions. The reviewer thinks it's auditing a submitted change; the implementer thinks it's addressing an external audit. That blindness is the point — a reviewer that knows the author is an agent grades the agent instead of the change.

## Why this exists

Running "implement, then review, then fix" with one agent reviewing its own work approves everything. Running it with two agents that chat with each other turns into negotiation. The mediator pattern keeps the review adversarial and the fixes honest — and the loop's hard-won operational rules keep it *actually running*:

- **One-shot agent invocations are not loops.** An agent told "loop until approved" runs one good round and exits with a to-do list. The loop lives in a supervisor (systemd/launchd/cron/`while`), which re-invokes the mediator with a state-detection prompt until a mechanical condition holds.
- **Terminate on evidence, not words.** The condition is "the PR left draft" — an external fact no transcript can fake. Draft PR opens after the first commit, so a dead container loses nothing; it's marked ready only on APPROVED.
- **Usage limits are naps.** Rate-limited rounds notify the user, sleep to the reset (default 5h), and resume.
- **Never forward a finding you could cheaply disprove.** The mediator reproduces disputed findings before relaying, in either direction.

## Use it

```
/mediator-loop <task or findings> in <repo>, branch <branch>
```

The skill discovers which engines exist on the machine (`claude`, `codex`, anything with a headless mode), assigns writer and read-only auditor roles, sets up the branch + draft PR, and runs rounds — reporting to your notify channel after every one.

Engines are interchangeable: any two CLIs, or the same CLI twice with different briefs. Nothing in the skill hardcodes hosts, models, or paths, so it behaves identically on any machine it's installed on.

## Relationship to review-fix-loop

`review-fix-loop` fixes a finding set **inside one session** — subagent implementers plus an adversarial verifier. `mediator-loop` is the **cross-process** version: independent CLI agents, disconnect-proof, limit-aware. They compose: a mediator-loop implementer can use review-fix-loop internally for a large findings batch.

## Install

```
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install mediator-loop@pragmatic-skills
```

Invoke as `/mediator-loop:mediator-loop`, or `/pragmatic:mediator-loop` from the bundle.
