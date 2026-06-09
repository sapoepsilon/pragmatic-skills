# xquik-x-data

Use Xquik when a user needs X/Twitter data or account-scoped X actions through the Xquik API, MCP server, or supported agent skill.

## When to use

- Search tweets, users, trends, articles, replies, quotes, likes, media, followers, or mutuals.
- Download tweet media, run data extractions, or create monitor and webhook workflows.
- Prepare confirmation-gated posting, DM, follow, unfollow, profile, draft, or compose actions.

## Guardrails

- Use the user's Xquik API key only. Never request X passwords, cookies, 2FA codes, recovery codes, or browser exports.
- Store API keys in environment variables or the client's secret store. Do not put keys in chat, command arguments, PRs, issues, logs, or docs.
- Ask for explicit approval before private reads, writes, deletes, monitors, webhooks, or usage-impacting actions.
- State the target, action, payload or query, delivery destination, and usage estimate before acting when those details matter.
- Summarize private or sensitive results narrowly. Do not forward private content to other tools without user consent.

## Install

Claude Code:

```
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install xquik-x-data@pragmatic-skills
```

Codex:

```bash
mkdir -p ~/.codex/prompts
cp plugins/xquik-x-data/codex/xquik-x-data.md ~/.codex/prompts/xquik-x-data.md
```

Then invoke `/xquik-x-data`.

## References

- Xquik docs: https://docs.xquik.com
- Xquik API: https://xquik.com/api/v1
- Xquik MCP endpoint: https://xquik.com/mcp
- Source package and skill metadata: https://github.com/Xquik-dev/x-twitter-scraper
