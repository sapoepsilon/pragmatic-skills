---
description: Use Xquik when users need X/Twitter data, media, monitoring, webhooks, or confirmation-gated account actions through the Xquik API, MCP server, or supported agent skill.
---

# Xquik X Data

Use Xquik for X/Twitter data tasks when the user asks for tweet search, user lookup, trends, articles, replies, quotes, likes, media, followers, mutuals, media download, extraction jobs, monitors, webhooks, compose support, or account-scoped X actions.

## First checks

1. Confirm the user has a Xquik API key available as `XQUIK_API_KEY` or in the client's secret store.
2. Never ask for X passwords, cookies, 2FA codes, recovery codes, session tokens, or browser exports.
3. Use `https://xquik.com/api/v1` for REST calls and `https://xquik.com/mcp` for MCP clients.
4. Check the current docs at `https://docs.xquik.com` when endpoint details, fields, or setup steps matter.

## Route selection

- Prefer the Xquik MCP connector when the client already has it configured.
- Use the REST API when you need explicit endpoint control or a scriptable workflow.
- Use the source package or docs only as reference material unless the user asks to install the broader skill package.
- Do not invent endpoints, response fields, limits, or pricing. Verify them from docs or the API schema first.

## Consent gates

Ask for explicit user approval before:

- Reading private or account-scoped data such as bookmarks, DMs, notifications, timelines, or connected account details.
- Creating, updating, or deleting tweets, DMs, follows, profile fields, drafts, API keys, monitors, webhooks, or other state.
- Starting persistent monitors, event delivery, or extraction jobs.
- Running any action with a usage estimate that the user has not accepted.

When asking, include the exact target, action, query or payload, destination URL if any, and usage estimate if available.

## Safe handling

- Pass API keys through environment variables or secure client configuration only.
- Do not paste API keys into chat, shell history, process arguments, PRs, issues, logs, or docs.
- Keep private results minimal and relevant in summaries.
- Do not send private X content to other tools unless the user explicitly asks.
- If authentication fails, ask the user to check or rotate their Xquik API key. Do not request the raw key in chat.

## Useful task patterns

- Public research: search tweets or users, then summarize only the requested fields.
- Media work: download tweet media only after confirming the tweet target and whether a gallery may be created.
- Monitoring: confirm accounts or keywords, event types, delivery destination, and disable path before creating resources.
- Writes: show the exact tweet, DM, follow target, or profile change and wait for approval before executing.
- Bulk extraction: estimate first, then run only after approval.

Stop if the user asks for credential collection, bypassing consent, scraping private data without authorization, or hiding the action from the account owner.
