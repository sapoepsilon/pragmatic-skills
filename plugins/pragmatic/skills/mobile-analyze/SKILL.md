---
name: mobile-analyze
description: Stage 1 of the mobile auto-shipper — gather context from Linear, Fireflies, GitHub, Sentry, code, screenshots, backend/frontend repos, and connected devices to confirm exactly what the developer wants before implementation. Use when starting mobile/backend/frontend autoship work, or when a later stage bounces back for clarification.
---

# mobile: analyze (stage 1 of 3)

Goal: turn a rough request into a **confirmed intent** and observable acceptance criteria. Nothing gets built until the developer green-lights the summary, unless they explicitly told you to skip confirmation.

## Loop

Run until you can state, concretely, *what is* and *what the developer wants* — then stop and ask.

1. **Gather context from every source that's connected** (skip silently what isn't):
   - **Linear** — ticket description, comments, linked issues, labels, customer needs.
   - **Fireflies** — meeting transcripts when the request references a call/client/team discussion.
   - **GitHub** — PRs, exact head branches/SHAs, diffs, CI, issues.
   - **Sentry** — issue/event/replay/profile when the request is a production bug.
   - **Codebase** — read the real screens/widgets/services/endpoints involved; use the project's graph (`graphify`) first if present.
   - **Visual/device** — screenshot or inspect the configured device when current behavior matters.
   - **Backend/Supabase** — inspect APIs, migrations, seed data, and non-prod health when the flow crosses mobile/backend boundaries.
   - **Any other MCP connectors / context gatherers** present in this session — use them; this list is not exhaustive.
2. Synthesize **findings**: current behavior, the gap, the target, repos/branches/files/screens/endpoints involved, backend/frontend interaction points, data preservation constraints, and open questions.
3. Define **acceptance criteria** as observable outcomes: entry point, action/API call, expected UI/API/database/log result, target device, and non-prod backend/Supabase URL.
4. If something is genuinely ambiguous, **bounce to the dev** (see Handoff) with a specific question — do not guess.

## Green-light gate

Post the findings to the developer over the configured channel as a tight summary (use `muchotexto` style): *here's every finding, here's how it is now, here's where you want to go, here's how I'll verify it — correct?* Attach a screenshot if it clarifies. **Wait for an explicit yes** when there is ambiguity or any side effect.

- **Approved** → record confirmed intent + acceptance criteria in run-state and hand off to `mobile-implement`.
- **Correction** → fold the feedback in and loop again.

## Handoff contract

Carry forward:

- Confirmed intent, findings, acceptance criteria, and who approved.
- Repos/branches/PRs involved, including exact PR head branch/SHA when applicable.
- Files/screens/endpoints likely involved.
- QA target: emulator, physical device, browser, CLI/API, backend URL, Supabase URL.
- Whether staging/Supabase reset is allowed; default is **preserve data**.

Never advance to implement without enough confirmed intent for a competent engineer to build and verify the change.
