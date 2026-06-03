# vault-session

Persistent session memory for Claude Code, backed by an Obsidian vault exposed via an MCP filesystem server.

Two skills:

- `/vault-session:resume` — pulls recent session logs and project decisions from the vault so you can pick up where you left off
- `/vault-session:save` — writes a dated session log into the vault so a future session can resume

Works from any machine that can reach your vault MCP — Macs, Linux boxes, ephemeral containers, anywhere. The skills self-bootstrap on first run: if no vault MCP is registered, they prompt for the URL and register it at user scope so every Claude Code project on that machine inherits the same vault.

## Install

```
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install vault-session@pragmatic-skills
```

That's it. The first time you invoke `/vault-session:resume` or `/vault-session:save` on a machine, the skill detects that no vault MCP is registered and prompts you for:

1. **Vault MCP URL** — default `http://obsidian-bridge:9876/servers/vault-fs/sse`
2. **MCP server name** — default `vault-fs`
3. **Transport** — default `sse`

It then runs `claude mcp add` with your answers at **user scope**, so every Claude Code project on that machine inherits the registration. A sentinel at `${XDG_CONFIG_HOME:-~/.config}/vault-session/config.json` records the registration; subsequent invocations skip the prompt.

## Prerequisites

You need a vault MCP server reachable from this machine. The canonical setup that this plugin assumes:

- An Obsidian vault directory accessible to a network-reachable host (e.g. an LXC, NAS, or VM with the vault mounted via rclone, Syncthing, or local sync)
- `mcp-proxy` (or equivalent) wrapping `@modelcontextprotocol/server-filesystem` pointed at the vault directory, exposing an SSE endpoint
- The host reachable from your Claude Code machine — typically over Tailscale so the same hostname works from anywhere

If you don't have this yet, see the **Bridge setup** section below.

## Usage

### Resume

At the start of a working session in any project:

```
/vault-session:resume
```

The skill:

1. Derives the project key from `git remote get-url origin` (basename without `.git`), falling back to the current directory name
2. Reads the most recent 3 logs from `<vault>/<project>/logs/` via the MCP
3. Reads `<vault>/<project>/architecture/decisions.md` (or `decisions.md` / `ADR.md` / `architecture.md`) if present
4. Synthesizes a short summary: project, last session, where you left off, decisions in play, pending items
5. Offers optional pulls (recent permanent notes, open TODOs, cross-project context) — only fetched if you ask

Read-only. The vault is not modified.

### Save

At the end of a working session:

```
/vault-session:save
```

The skill:

1. Derives the project key the same way
2. Composes a session log from the conversation: what was done, decisions made, pending items, wikilinks to vault notes you read
3. Writes to `<vault>/<project>/logs/YYYY-MM-DD-<slug>.md` via the MCP
4. Suffixes `-2`, `-3` if a log with the same date and slug already exists — never overwrites
5. Offers (does not auto-run) a git commit + push if the working tree has uncommitted changes

## Bridge setup (one-time, per vault)

If you don't already have a vault MCP server, the simplest portable setup is a small always-on host (LXC, VM, NAS) that:

1. Has the vault mounted locally — either an Obsidian vault directory, or a remote vault mounted via `rclone` / Syncthing / git-sync
2. Runs `mcp-proxy` in front of `@modelcontextprotocol/server-filesystem` pointed at the mount, exposing port 9876 (or any port you choose)
3. Is on your Tailscale network, so the same URL works from any of your machines

Once that's running, every machine just needs Tailscale + this plugin. The plugin handles the rest.

### Why Tailscale

Two reasons:

- **One URL, everywhere.** Your laptop on your home Wi-Fi, the same laptop at a coffee shop, an ephemeral Linux VM, a CI runner with Tailscale auth — all reach the bridge via the same hostname.
- **No public exposure required.** The bridge does not need a public HTTPS endpoint. The vault is reachable only over your tailnet.

If you do want to reach the vault from a container that can't run Tailscale (e.g. an ephemeral sandbox), you can layer Tailscale Funnel on the bridge — but only after putting authentication in front of the MCP, since the upstream filesystem server has no auth of its own.

## Configuration

Stored at `${XDG_CONFIG_HOME:-~/.config}/vault-session/config.json`:

```json
{
  "mcp_name": "vault-fs",
  "mcp_url": "http://obsidian-bridge:9876/servers/vault-fs/sse",
  "bootstrapped_at": "2026-06-02T12:00:00Z"
}
```

To re-bootstrap (e.g. after the bridge URL changes):

```bash
rm "${XDG_CONFIG_HOME:-$HOME/.config}/vault-session/config.json"
claude mcp remove vault-fs --scope user
```

Next invocation of resume or save will re-prompt.

## Conventions

- **Project key** — derived from `git remote get-url origin` basename (without `.git`), or current directory name as fallback
- **Logs path** — `<vault-root>/<project>/logs/YYYY-MM-DD-<slug>.md`
- **Decisions doc** — first match of `architecture/decisions.md`, `decisions.md`, `ADR.md`, `architecture.md` under `<vault-root>/<project>/`
- **Wikilinks** — Obsidian-style `[[note-name]]` syntax for cross-references

The plugin does not enforce these on the rest of your vault — you can have any structure you like outside `<project>/logs/`.

## License

MIT.
