# loopcopy

You spend a session brainstorming or debugging something. You want it to *keep going* — on a schedule, in its own session, maybe on another machine. `loopcopy` reads what you have been doing, asks only about the gaps, and hands you one `/loop …` command on your clipboard.

Paste it into a fresh session. That is the whole workflow.

## Why not just write the loop yourself

Because the loop runs in a session with **no memory of the conversation that produced it**. The failure modes are boring and repeatable:

- relative paths, or "the file we were looking at" — the fresh session has no idea
- no ledger file, so every iteration redoes iteration one instead of building on it
- no stop condition, so it runs until someone notices
- no guardrails, so a 3am iteration pushes to `main`
- a payload that starts with `5m` or ends with `every 30 minutes` — `/loop` eats those as the interval

`loopcopy` enforces all of that as a checklist before anything reaches the clipboard.

## Use it

```
/loopcopy
/loopcopy keep the PR checks green while I'm out
```

It will:

1. **Harvest** — the conversation, plus `git` state, branch, ticket IDs, and the project's real build/test commands.
2. **Ask only what is missing** — at most three questions, each with its inferred answer offered first. If everything is inferable, it asks nothing.
3. **Pick a cadence** — a fixed interval (converted to cron, with uneven intervals rounded and flagged) or dynamic self-pacing when the next run should be gated on an event.
4. **Compose a standalone payload** — absolute paths, a progress ledger it reads first and appends to last, explicit guardrails, an explicit stop condition.
5. **Copy it anywhere** — `pbcopy` / `wl-copy` / `xclip` / `xsel` / `clip.exe` / `clip` / `Set-Clipboard` / `termux-clipboard-set`, with an OSC 52 fallback for SSH and tmux. Every command is also saved to `~/.claude/loopcopy/` because clipboards get overwritten.

It never starts the loop in your current session — that is what `/loop` is for.

## What comes out

```
/loop 15m Babysit the open PRs for the whispera repo. Repo: /Users/uzi/Developer/whispera (branch main). Each run: 1) read /Users/uzi/Developer/whispera/plans/loop-pr-babysit.md for prior runs; 2) run `gh pr list --state open --json number,title,statusCheckRollup`; 3) for any PR whose checks went red since the last run, read the failing job log and post a one-paragraph diagnosis as a PR comment; 4) append a dated line per PR touched to that ledger. Guardrails: never push, merge, close, or re-run workflows — comment only. Stop when no open PR has been red for two consecutive runs, and tell me.
```

## Install

**Claude Code** (via marketplace):

```
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install loopcopy@pragmatic-skills
```

Invoke as `/loopcopy:loopcopy`, or `/pragmatic:loopcopy` from the bundle.

**Codex** (manual copy):

```bash
mkdir -p ~/.codex/prompts
cp plugins/loopcopy/codex/loopcopy.md ~/.codex/prompts/loopcopy.md
```

Codex has no `/loop` of its own — there the skill is a cross-tool handoff: it packages the Codex session's work into a command you paste into Claude Code.

## Requirements

None beyond a shell. A clipboard utility is used when present; when none exists the command is still printed and saved to a file, and the skill says plainly that the copy failed rather than pretending it worked.
