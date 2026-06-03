---
description: Save the current Claude Code session as a dated log in an Obsidian vault exposed via an MCP filesystem server. Use when the user types /save, says "save this session", "save my progress", "log this", "end of session", or otherwise asks you to persist what was done so a future session can resume it. On first run on a machine, bootstraps by registering the vault MCP server.
---

# vault-session: save

Write a session log into the user's Obsidian vault so a future `/resume` can pick up where this session left off.

## What "the vault" means

A network-accessible Obsidian vault exposed via an MCP filesystem server. See the resume skill for the canonical setup. This skill writes to the same MCP server.

## Step 1 — Bootstrap if needed

Same procedure as the resume skill's bootstrap. Check `claude mcp list` for a registered vault MCP. If absent or disconnected, prompt for URL / name / transport and run `claude mcp add --transport <transport> --scope user <name> <url>`. Write the sentinel at `${XDG_CONFIG_HOME:-$HOME/.config}/vault-session/config.json`.

If `/resume` ran earlier in this session and already bootstrapped, the sentinel will be present — skip to Step 2.

## Step 2 — Determine the project key

Same derivation as resume:

1. `git remote get-url origin` → basename without `.git`.
2. Fallback to `basename $PWD`.
3. Lowercase, kebab-case.

Call this `$PROJECT_KEY`.

## Step 3 — Compose the log content

The log is a single markdown file. Synthesize content from the current conversation:

- **What was done** — concrete changes, commits, files touched. Be specific (file paths, function names, decisions). Not "worked on auth" but "wired Clerk into apps/web/middleware.ts and migrated session lookups to the JWT verify path."
- **Decisions made** — choices the user committed to that affect future work. Include the *why* when stated.
- **Pending** — what is genuinely left to do. Include enough context that a future session can act on it without re-discovering the goal.
- **Wikilinks** — for any vault notes you read or referenced this session, link them with `[[note-name]]` syntax so Obsidian's graph picks them up.

Do NOT include:
- Mechanical conversation noise ("user asked X, I ran Y")
- Tool call transcripts
- File contents that are already in git

Frontmatter to prepend:

```yaml
---
title: <one-line summary, sentence case>
project: <PROJECT_KEY>
date: <YYYY-MM-DD>
tags: [session-log, <PROJECT_KEY>]
type: log
---
```

## Step 4 — Derive filename

Format: `YYYY-MM-DD-<slug>.md`.

- Date: today, UTC, `YYYY-MM-DD`.
- Slug: 3–6 lowercase words drawn from the one-line summary, joined with `-`. Drop stop words. Example summary "Wired Clerk auth into the web app middleware" → slug `clerk-auth-web-middleware`.

If a log with this exact name already exists for today (same date and slug), append `-2`, `-3`, etc. Do NOT overwrite.

## Step 5 — Write via the vault MCP

Path: `<vault-root>/<PROJECT_KEY>/logs/<filename>`.

Before writing, ensure the directory exists. Use the MCP's `create_directory` tool if available; harmless to call when the directory already exists.

Write the file via the MCP's `write_file` tool. The MCP-namespaced tool name depends on the server name the user registered — typically `mcp__<server-name>__write_file`.

After writing, confirm by reading the file back and verifying the byte count matches.

## Step 6 — Git commit and push (opt-in, not automatic)

If the current working directory is inside a git repository AND has uncommitted changes that match the work described in the log:

- Surface a one-line offer: "Want me to also commit and push the code changes from this session?"
- Do NOT commit automatically. The user's preferences may be commit-on-demand only.

## Step 7 — Confirm to the user

One short line: `Saved: <vault-relative-path>`. That is all. Do not summarize the log content — the user just lived it.

## Hard rules

- Do NOT overwrite an existing log. Suffix `-2`, `-3`, etc.
- Do NOT save an empty or trivially short log. If the session had no concrete progress, tell the user and ask whether to save anyway.
- Do NOT prompt for vault URL on every invocation — only when bootstrap is needed.
- Do NOT modify any file outside `<vault-root>/<PROJECT_KEY>/logs/` during `/save`.
- If the MCP server is registered but disconnected, surface the error — do not silently fall back to writing locally.
