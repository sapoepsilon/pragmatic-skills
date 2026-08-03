---
name: mediator-loop
description: Run a blind implement -> review -> fix loop between two agents that never learn of each other's existence, mediated until an independent reviewer returns APPROVED. Engine-agnostic — implementer and reviewer can be any two CLIs (or the same one twice). Use when the user says "mediator loop", "blind loop", "run implement/review until approved", or hands you findings plus a repo and wants them fixed with independent sign-off rather than self-review. For responding to an existing set of findings with subagents inside ONE session, use review-fix-loop instead.
---

# mediator-loop

You are the MEDIATOR. Two agents work for you: an IMPLEMENTER that writes code and a REVIEWER that audits it. Neither knows the other exists — each believes it is dealing with a human upstream. Only the reviewer's explicit approval ends the loop; never your own judgment, never a round cap.

Why blindness: a reviewer that knows the author is an agent grades the agent, not the change; an implementer that knows the reviewer is an agent argues with it. Strip tool names, model names, and agent identities from everything you relay in BOTH directions. Findings arrive at the implementer as "external audit findings"; diffs arrive at the reviewer as "a submitted change to audit".

## Engines and models

Discover what exists on the machine (`command -v claude codex …`) and assign roles. Any two engines work — including the same binary twice with different briefs — they must simply never see each other's names. The reference pairing:

| Role | Engine (reference) | Model policy | Invocation |
|---|---|---|---|
| Implementer | Claude Code, headless | The vendor's **latest top coding model** via a latest-tracking alias — for Claude, `--model opus` (resolves to the newest Opus). User may override per role. | `cd <repo> && claude --model opus --dangerously-skip-permissions -p "<brief>"`, continued across rounds with `-c` — warm context beats a fresh agent |
| Reviewer | Codex CLI, read-only sandbox | The CLI's default/latest model unless the user overrides (`codex -m <model>`) | `codex exec -C <repo> "<review packet>"` — keep the sandbox read-only |
| Mediator | You — or, when the loop runs as its own agent process, prefer the most capable model available (e.g. Claude Fable 5) since gating judgment bounds the whole loop. Optional: any competent orchestrator works. | — | supervisor re-invokes per round (below) |

**Model rules:**
- **Never pin dated model IDs in briefs, configs, or supervisors.** Use latest-tracking aliases (`opus`, the CLI's default) so the loop upgrades itself when vendors ship new models. Pin only when the user asks for reproducibility.
- **The user chooses.** Every role's engine AND model are user-overridable; the table is the default, not a constraint.
- **Write each brief in that vendor's recommended prompt style — consult their current model guidance, don't assume.** Anthropic and OpenAI both publish per-model prompting guides, and the advice changes between generations (recent Claude models: full task spec up front, goal + constraints rather than step-by-step prescriptions, no aggressive "CRITICAL/MUST" language, and no ordered self-verification steps — they verify on their own and over-prescription reduces quality). A brief tuned for one vendor's model pasted into another's is a silent quality tax.
- **Blindness still applies**: the model name may appear in the *invocation*, never in the *content* relayed between roles.

## Setup (adapt to the machine — never hardcode)

- **Repo**: work on a feature branch, never the default branch. Commits land on the branch each round.
- **Draft PR FIRST — before any review round.** As soon as the first commit lands:
  ```sh
  git push -u origin <branch>
  gh pr create --draft --base <default-branch> --head <branch> \
    --title "<task>" --body "Draft while the autonomous review loop runs."
  ```
  The branch + draft PR on the remote are the loop's persistence — if the host, container, or session dies, no work is lost. The draft→ready flip is the approval gate: `gh pr ready <num>` runs ONLY on APPROVED. This also gives the loop its mechanically checkable termination condition — `gh pr view <num> --json isDraft,state` shows `OPEN` and `isDraft: false` — which no agent can fake by narrating success.
- **Notify channel**: if the user gave one (Telegram, Slack, email), report after EVERY round: round #, findings count, verdict, evidence links. Send it yourself — never delegate the report to a sub-agent that might forget.

## The round

1. **Implement.** Round 1: the task, verbatim, plus every constraint you know that the implementer cannot discover itself (platform limits, forbidden APIs, prior decisions). Tell it to set a definition of done and iterate until build and tests are green. Later rounds: the reviewer's findings, identity-stripped, otherwise verbatim — and when the batch is large, tell the implementer to address them with its `review-fix-loop` skill if installed (subagent implementers + an adversarial verifier inside its own session; see Boundaries). The implementer commits and pushes the working branch.
2. **QA before spending a review round.** Build at the pushed SHA on whatever the project's real build target is, and verify the target's HEAD matches the pushed SHA before trusting any result — stale checkouts produce green builds of old code. Pull logs or run probes for each finding. If GUI-level QA needs a human who isn't there, substitute evidence you can get (builds, tests, logs) and say so plainly in the report — never silently skip, never block.
3. **Review.** Packet = task statement + the full current diff against the default branch + how it was QA'd. Require concrete findings with file:line, severity, and why, and a last line that is exactly `VERDICT: APPROVED` or `VERDICT: CHANGES-REQUESTED`. The reviewer must also re-verify its earlier findings against the new diff — round-N fixes regress round-N−1 findings constantly.
4. **Gate the findings.** Never forward a reviewer claim you could cheaply disprove: reproduce disputed findings first, and push back on the reviewer with evidence when one doesn't hold. Forwarding hallucinated findings burns implementer rounds; accepting them silently corrupts the codebase.
5. **CHANGES-REQUESTED** → relay to the implementer, next round. **APPROVED with zero blocking findings** → update the PR body with a findings-addressed summary, `gh pr ready <num>`, send the final report.

## Keeping the loop alive (learned the expensive way)

- **One-shot invocations are not loops.** An agent process told "loop until approved" will run one good round and exit with a to-do list — the loop must be a property of the SYSTEM, not a hope about one process. Wrap the mediator in a supervisor (systemd unit, launchd job, cron, or a shell `while`) that re-invokes it with a state-detection prompt ("read the round log and the branch's git log, determine where the loop stands, continue") until the mechanical termination condition holds.
- **Terminate on evidence, not on words.** The supervisor checks the PR's draft state (or an equally unfakeable external fact) — never greps the transcript for "APPROVED", which also appears in every instruction that mentions the verdict format.
- **Usage limits are pauses, not failures.** If a round's output shows rate/usage-limit signatures (429, quota, overloaded, limit reached), notify the user, sleep until the reset (default 5 hours if unknown), and resume. The loop survives the nap.
- **Keep per-round transcripts** (append-only round log). The state-detection prompt reads them; so does the user's post-mortem.
- **Watch your own watcher.** If you monitor the supervisor from another session, remember that session restarts kill monitors silently — re-arm on reconnect and check the real state directly rather than trusting silence.

## Rules

- You never edit code yourself. You mediate, QA, and gate.
- The implementer never merges; the reviewer never writes; you never approve.
- Report every round to the user's channel even when nothing notable happened — silence is indistinguishable from death.
- Do not stop to ask the user anything unless truly blocked on access or credentials they haven't provided.

## Boundaries

This skill is a cross-process orchestration pattern: two independent CLI agents plus you, surviving disconnects and limits. For fixing a concrete finding set with subagents inside a single session — implementers plus an adversarial verifier, no second CLI — use `review-fix-loop`. The two compose: a mediator-loop implementer can be told to use review-fix-loop internally when addressing a large findings batch.
