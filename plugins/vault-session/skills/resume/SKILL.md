---
description: Resume a Claude Code session by pulling recent session logs and project decisions from an Obsidian vault exposed via an MCP filesystem server. Use when the user types /resume, says "resume", "where did I leave off", "what was I doing", "continue from last session", or otherwise asks you to reload context that was persisted to their vault. On first run on a machine, bootstraps by registering the vault MCP server.
---

# vault-session: resume

Reload the user's working context for the current project from their Obsidian vault.

## What "the vault" means

A network-accessible Obsidian vault exposed via an MCP filesystem server. The canonical setup is a Tailscale-reachable host (LXC, NAS, server) running `mcp-proxy` in front of `@modelcontextprotocol/server-filesystem` pointed at the vault directory. The user may run their own variant — what matters is that the MCP server is reachable and exposes the vault as a filesystem.

The MCP server is registered in Claude Code under a user-chosen name (default `vault-fs`). This skill calls the MCP's filesystem tools — typically `list_directory`, `read_text_file`, `write_file`, `create_directory`, `search_files` — under whatever name the user registered the server. Do NOT hardcode tool names; introspect what the registered MCP exposes.

## Step 1 — Bootstrap if needed

Check whether an MCP server pointing at a vault filesystem is already registered.

```bash
claude mcp list 2>&1
```

Parse the output. A vault-fs registration looks like a line containing `/servers/vault-fs/sse` or any URL ending in `.../sse` that the user identifies as their vault.

**If a vault MCP appears connected (`✓ Connected`):** skip to Step 2.

**If no vault MCP is registered, or the existing one is failing:** run the bootstrap flow. Ask the user three things via AskUserQuestion (one question, three fields if your harness supports it; otherwise sequentially):

1. **Vault MCP URL** — default `http://obsidian-bridge:9876/servers/vault-fs/sse`. Tell the user this default assumes a Tailscale host named `obsidian-bridge` running on the standard mcp-proxy port. They should override if their host or port differs.
2. **MCP server name** — default `vault-fs`. This is the name Claude Code will use to identify the server.
3. **Transport** — default `sse`. Use `http` if the user's server uses streamable HTTP instead.

Then register the server at user scope so every project on this machine inherits it:

```bash
claude mcp add --transport <transport> --scope user <name> <url>
```

After registration, verify it connects:

```bash
claude mcp list 2>&1 | grep "<name>"
```

If it doesn't show `✓ Connected`, surface the error to the user. Common causes:
- Tailscale not running on this machine — tell them to start it
- Bridge host unreachable — tell them to verify the host is up
- HTTPS required — tell them to either enable Tailscale Funnel + auth on the bridge, or pass `--allow-http` via `mcp-remote` wrapper

Write a sentinel marking bootstrap complete so subsequent invocations skip Step 1:

```bash
mkdir -p "${XDG_CONFIG_HOME:-$HOME/.config}/vault-session"
cat > "${XDG_CONFIG_HOME:-$HOME/.config}/vault-session/config.json" <<EOF
{
  "mcp_name": "<name>",
  "mcp_url": "<url>",
  "bootstrapped_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

## Step 2 — Determine the project key

The vault organizes notes per-project. Derive the project key from the current working directory:

1. Try `git remote get-url origin 2>/dev/null` — if it succeeds, take the basename without `.git`. Example: `git@github.com:user/my-app.git` → `my-app`.
2. If no git remote, use the basename of the current working directory (`basename $PWD`).
3. Convert to lowercase, kebab-case if needed.

Call this `$PROJECT_KEY`. Tell the user which key you derived in one short line so they can correct it if wrong.

## Step 3 — Pull recent session logs

Using the vault MCP, list the logs directory for this project:

- Path: `<vault-root>/<PROJECT_KEY>/logs/`
- Sort entries by name descending (filenames are `YYYY-MM-DD-slug.md`, so name sort === chronological sort).
- Read the most recent 3 entries by default.

If the logs directory does not exist:
- This is the first session for this project. Tell the user explicitly.
- Do NOT create the directory yet — `/save` will create it when the user ends the session.

If fewer than 3 logs exist, read whatever is available.

## Step 4 — Pull project decisions/architecture (the user opted in)

After reading logs, also fetch any of these if they exist in the vault under `<PROJECT_KEY>/`:

- `architecture/decisions.md`
- `decisions.md`
- `ADR.md`
- `architecture.md`

Read the first one that exists. Do not error if none do.

## Step 5 — Optional extras (offer, do not auto-pull)

After presenting the summary, offer the user three optional pulls they can ask for explicitly:

- **Recent permanent notes** — anything under `permanent/` modified in the last 7 days
- **Open TODOs** — grep the vault for unchecked task list items (`- [ ]`) under `<PROJECT_KEY>/`
- **Cross-project context** — recent logs from other projects (last 7 days)

Phrase the offer as one line: "Want me to also pull recent permanent notes, open TODOs, or cross-project context?"

## Step 6 — Synthesize and present

Write a short summary in this shape:

```
**Project:** <PROJECT_KEY>
**Last session:** <date of most recent log, or "no prior sessions">

**Where you left off**
<2-4 bullets distilling the most recent logs — what was done, what was pending>

**Decisions in play** (if a decisions doc was found)
<1-3 bullets of standing decisions relevant to current work>

**Pending**
<bullets of items the most recent logs flagged as TODO/next>
```

Keep it tight. The user is loading context, not reading a report. If they want more they will ask.

## Hard rules

- Do NOT modify the vault during `/resume`. Read-only.
- Do NOT prompt for the bridge URL on every invocation — only when bootstrap is needed.
- Do NOT hardcode the user's vault layout beyond what is documented here. Different users have different conventions; respect what is in the vault.
- If the MCP server is registered but disconnected, fix-or-tell — do not silently fall back to local reads.
- If the user has multiple vault MCPs registered, ask which one to use rather than guessing.
