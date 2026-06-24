#!/usr/bin/env bash
# mobile-autoship channel bridge — our own relay, replacing Factory's Pro remote plumbing.
# Telegram message -> `droid exec` in a repo (on your subscription via the proxy) -> reply.
# Config comes from the environment (load a gitignored env file in the systemd unit):
#   TELEGRAM_BOT_TOKEN  (required)  from @BotFather
#   ALLOWED_CHAT_ID     (required)  only this chat may drive it
#   REPO_PATH           (required)  repo droid works in
#   MODEL               default: custom:GLM-5.2-[Proxy]-0  (a proxy model = subscription)
#   DROID_BIN           default: /root/.local/bin/droid
#   AUTO_LEVEL          default: medium  (low=read-only, medium=workspace-write, high=full)
#
# ponytail: single-threaded, one request at a time. Gates/state-machine bolt on later;
# this is the raw channel that proves the loop.
set -u

: "${TELEGRAM_BOT_TOKEN:?set TELEGRAM_BOT_TOKEN}"
: "${ALLOWED_CHAT_ID:?set ALLOWED_CHAT_ID}"
: "${REPO_PATH:?set REPO_PATH}"
MODEL="${MODEL:-custom:GLM-5.2-[Proxy]-0}"
DROID_BIN="${DROID_BIN:-/root/.local/bin/droid}"
AUTO_LEVEL="${AUTO_LEVEL:-medium}"
API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"

send() { # send(text)
  curl -s -X POST "$API/sendMessage" \
    --data-urlencode "chat_id=${ALLOWED_CHAT_ID}" \
    --data-urlencode "text=$1" >/dev/null
}

# Start from the latest update so we skip any backlog from before the bridge came up.
offset=$(curl -s "$API/getUpdates?offset=-1" | jq -r '.result[-1].update_id // 0')
offset=$((offset + 1))
send "🤖 mobile-autoship bridge online — repo: $(basename "$REPO_PATH"), model: ${MODEL##*:}. Send a request."

while true; do
  resp=$(curl -s --max-time 60 "$API/getUpdates?timeout=50&offset=${offset}") || { sleep 2; continue; }
  # process substitution (NOT a pipe) so $offset survives the loop
  while read -r upd; do
    [ -z "$upd" ] && continue
    uid=$(echo "$upd" | jq -r '.update_id')
    offset=$((uid + 1))
    chat=$(echo "$upd" | jq -r '.message.chat.id // empty')
    text=$(echo "$upd" | jq -r '.message.text // empty')
    [ -z "$text" ] && continue
    [ "$chat" != "$ALLOWED_CHAT_ID" ] && { echo "ignored chat $chat"; continue; }

    send "⏳ Running in $(basename "$REPO_PATH"): ${text}"
    out=$(cd "$REPO_PATH" && PATH="$(dirname "$DROID_BIN"):$PATH" \
          "$DROID_BIN" exec -m "$MODEL" --auto "$AUTO_LEVEL" "$text" 2>&1 | tail -c 3500)
    diff=$(cd "$REPO_PATH" && git diff --stat 2>/dev/null | tail -c 800)
    send "✅ Done.\n\n${out}\n\n— changes —\n${diff:-(none / not a git repo)}"
  done < <(echo "$resp" | jq -c '.result[]?' 2>/dev/null)
done
