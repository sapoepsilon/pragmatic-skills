---
name: mobile-analyze
description: Stage 1 of the mobile auto-shipper — analyze. Loop over every available context source (Linear, Fireflies, the codebase, screenshots, whatever MCP connectors exist) to figure out what the developer actually wants, then get an explicit green light before any code is written. Use when starting a mobile-autoship run from a request, or when a later stage bounces back here for clarification.
---

# mobile: analyze (stage 1 of 3)

Goal: turn a rough request into a **confirmed intent** the implement stage can act on. Nothing gets built until the developer green-lights this stage's summary.

## Loop

Run until you can state, concretely, *what is* and *what the developer wants* — then stop and ask.

1. **Gather context from every source that's connected** (skip silently what isn't):
   - **Linear** (`mcp__linear__*`) — the ticket, its description, comments, linked issues.
   - **Fireflies** (`mcp__fireflies__*`) — if the developer discussed this with a client/team, pull the relevant transcript.
   - **Codebase** — read the actual screens/widgets/state involved; use the project's graph (`graphify`) first if present.
   - **Visual** — screenshot the current state on the configured device (iOS sim / Android MCP) so "what is" is grounded.
   - **Any other MCP connectors / context gatherers** present in this session — use them; this list is not exhaustive.
2. Synthesize **findings**: current behavior, the gap, the target, the files/screens involved, open questions.
3. If something is genuinely ambiguous, **bounce to the dev** (see Handoff) with a specific question — do not guess.

## Green-light gate

Post the findings to the developer over the configured channel as a tight summary (use `muchotexto` style): *here's every finding, here's how it is now, here's where you want to go — correct?* Attach a screenshot if it clarifies. **Wait for an explicit yes.**

- **Approved** → write the confirmed intent to run-state and hand off to `mobile-implement`.
- **Correction** → fold the feedback in and loop again.

## Handoff contract

This stage talks to the **developer** (it's the first stage). When you cannot proceed, bounce *up* to the dev with a prompt like: *"I'm not sure what you want here — [specific question]."* Never advance to implement without a confirmed intent. Record the decision (intent + findings + who approved) in the run-state so a later bounce-back to this stage has the history.
