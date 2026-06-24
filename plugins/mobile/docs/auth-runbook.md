# Auth & re-auth runbook

Three things authenticate in this setup, and **none of them needs a paid API key** — the proxy and the Factory account both use free OAuth. Inference always runs on your subscription via the proxy; the Factory login is only account/relay auth.

## 1. Proxy (subscription → local OpenAI/Anthropic-compatible endpoint)

**Linux — CLIProxyAPI** (`:8317`):
- ChatGPT/Codex: `cli-proxy-api -codex-device-login` → visit `auth.openai.com/codex/device`, enter the code.
- Claude: `cli-proxy-api -claude-login -no-browser` → open the printed URL.
- z.ai/GLM: an API key in `config.yaml` under `openai-compatibility` — no OAuth, nothing to re-auth.
- Apply: `systemctl restart cliproxyapi`. Verify: `curl -H "Authorization: Bearer <client-key>" http://<host>:8317/v1/models`.
- Access tokens auto-refresh (~15m). You only re-auth if the *refresh/session* token dies (then re-run the device-login above).

**macOS — VibeProxy**: menu-bar icon → Connect → the provider (GUI OAuth).

## 2. Droid account login (headless, free OAuth — not an API key)

A Droid Computer needs a Factory **account** login. API keys are a paid tier; the OAuth login is free and sufficient. On a headless box the TUI can't run directly, so drive it through tmux:

```bash
apt-get install -y tmux
tmux new-session -d -s login "droid; sleep 900"
sleep 12; tmux capture-pane -t login -p            # login menu ("> Login")
tmux send-keys -t login Enter                       # choose Login
sleep 10; tmux capture-pane -t login -p             # prints: visit https://auth.factory.ai/device + code XXXX-XXXX
# approve in a browser with your Factory account, then:
tmux kill-session -t login
```

Verify: `~/.factory/auth.v2.file` exists and `droid exec "reply OK"` returns.

## 3. Droid Computer (relay) — register + daemon

After the account login:

```bash
droid computer register <name> -y     # registers through Factory's relay
droid computer list                   # confirms (this machine)
```

Run `droid daemon --remote-access` as a systemd service (`Restart=always`) so the machine stays online:

```ini
[Service]
Environment=PATH=/root/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/root/.local/bin/droid daemon --remote-access
Restart=always
```

`systemctl status droid-daemon` → the log should show `Daemon is running` + a `wss://relay.factory.ai/...` URL. That relay is how Slack/web tasks reach this box. **Registration works on the free OAuth account — no paid key.**

## Model stays on your subscription

The Factory login is account/relay only. Inference routes through the proxy via `~/.factory/settings.json` → `customModels[].baseUrl` = the proxy `:8317/v1`, so the model runs on your subscription, never Factory model billing.
