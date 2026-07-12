# backend-comprehensive-review

Multi-agent end-to-end backend/API PR review — the server-side counterpart of `mobile-comprehensive-review`.

A phased orchestrator that reviews a PR the way a senior backend reviewer would:

1. **Architecture & Context** — map the affected layers and the patterns the PR should follow.
2. **Parallel Review Passes** — correctness, security/authorization, migrations/data, and test coverage reviewers run as parallel subagents; findings are merged and severity-classified. A user checkpoint gates the expensive phases.
3. **Checks** — the repo's own lint/unit/integration commands, pass/fail/not-run with reasons.
4. **Runtime Verification** — real authenticated requests against a confirmed non-prod target, with response/DB/log assertions, the negative authorization case, and `verify-to-e2e` codification.
5. **Consolidated Verdict** — a PR-ready approve/comment/request-changes/blocked report.

Each phase writes its output to `.backend-review/` with a resumable `state.json`, mirroring the comprehensive-review orchestrator pattern.

## Project extension

The skill is agnostic to environments, databases, and servers. Project facts (run commands, non-prod target, auth recipe, fixtures, evidence policy) live in a repo-local extension at `.claude/skills/comprehensive-review-extension/SKILL.md`, shared with `mobile-comprehensive-review`. When the extension is missing, the skill offers to set it up: it infers what it can from the codebase (CI workflows, package scripts, test helpers, env templates) and asks the developer only for the gaps.

## Install

```
/plugin install backend-comprehensive-review@pragmatic-skills
```

or install the `pragmatic` bundle to get everything.

## Usage

Ask for a comprehensive review of a backend PR:

```
Do a comprehensive review of PR #123
```

The skill locks the exact head SHA, runs the phases in order, stops at checkpoints, and produces `.backend-review/05-verdict.md` ready to post on the PR.
