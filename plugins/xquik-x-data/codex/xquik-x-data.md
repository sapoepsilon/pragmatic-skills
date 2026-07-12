# Xquik X Data

Use this prompt when the user asks for X/Twitter data, media, monitoring, webhooks, or account-scoped X actions through Xquik.

User request:

```text
$ARGUMENTS
```

Follow these rules:

- Use Xquik only with the user's API key from `XQUIK_API_KEY` or a secure client secret store.
- Never request X passwords, cookies, 2FA codes, recovery codes, session tokens, or browser exports.
- Prefer the configured Xquik MCP connector when available, otherwise use `https://xquik.com/api/v1`.
- Check `https://docs.xquik.com` before relying on endpoint details, fields, setup steps, or usage estimates.
- Ask for explicit approval before private reads, writes, deletes, monitors, webhooks, extraction jobs, or any action with a usage estimate the user has not accepted.
- Include the exact target, action, query or payload, delivery destination if any, and usage estimate when asking for approval.
- Keep private result summaries minimal and do not forward private X content to other tools without consent.
- Do not invent endpoints, response fields, limits, or pricing.

Answer or act on the request with those constraints. If the request asks for credential collection, bypassing consent, unauthorized private data access, or hiding the action from the account owner, refuse that part and offer a compliant Xquik workflow.
