---
name: mobile-implement
description: Stage 2 of the mobile auto-shipper — implement a confirmed mobile/backend/frontend change on the exact branch, using Hermes tools directly or an available coding engine, then build/test until green before QA. Use after mobile-analyze approval or when mobile-qa bounces a precise failure back.
---

# mobile: implement (stage 2 of 3)

Goal: realize the **confirmed intent** from stage 1 as working code in the correct repo(s), on the correct branch, then hand to QA. This stage does not decide product scope — that came from analyze.

## Engine modes

- **Hermes mode** (`engine.tool: "hermes"`) — edit with Hermes file tools and verify with terminal/mobile/browser/MCP tools.
- **Droid mode** (`engine.tool: "droid"`) — drive the engine with `droid exec -m <engine.model> --auto medium "<intent + acceptance>"`, then independently inspect the diff and run the build/test commands.
- Optional helpers (`opencode`, `claude`, `codex`) may assist if configured, but the orchestrating agent remains responsible for correctness and verification.

## Loop

1. **Pin branch identity.** For new work, create `<branchPrefix><short-slug>` from the intended base. For existing PR/deploy work, resolve the GitHub PR head branch/SHA and check out exactly that; never assume a similarly named local branch is correct.
2. **Inspect conventions.** Read project instructions (`CLAUDE.md`, `AGENTS.md`, `.hermes.md`), nearby implementation, and nearby tests before editing.
3. **Implement.** Make deterministic edits with file tools or a configured helper engine. Keep mobile/backend/frontend contracts in sync when the flow crosses repos.
4. **Build/test with real commands.** Run the configured commands from `.mobileship.json`. Feed actual errors back into the loop. If the same class of failure repeats without progress, stop and bounce rather than thrashing.
5. **Prepare handoff.** Record branch, files changed, commands run, results, backend/Supabase implications, and exactly what QA must verify.

## Kentra command references

Mobile (`/home/ubuntu/kentra-mobile`):

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter build apk --debug
```

Backend (`/home/ubuntu/kentra-backend`):

```bash
npm run lint
npm run test:unit -- --run
```

Use the command(s) relevant to the repo touched. If both mobile and backend changed, verify both and QA the integrated flow against non-prod staging.

## Guardrails

- Never work on the default branch for new implementation.
- Never bypass hooks or tests with `--no-verify`.
- Never claim green without real command output.
- Never reset staging/Supabase unless the user approved wiping QA data.
- Do not silently switch target branch, repo, device, backend, or engine.
