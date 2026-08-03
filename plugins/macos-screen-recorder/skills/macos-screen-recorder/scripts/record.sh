#!/bin/bash
# macOS screen recorder for agent-driven QA/demo capture.
# Capture is screencapture -v (needs the invoking context to hold the Screen
# Recording TCC grant — over SSH that means an Aqua-session LaunchAgent).
#
#   record.sh start [--dir DIR] [--display N]   begin full-screen recording
#   record.sh stop [SLUG]                       finalize -> DIR/SLUG.mov (faststart)
#   record.sh rect "App Name"                   print crop JSON for render.sh --rect-json
#   record.sh stage "App Name"                  hide every other app + desktop icons
#   record.sh unstage                           restore desktop icons
set -euo pipefail

DIR="${MSR_DIR:-$HOME/qa-artifacts/recordings}"
PID_FILE="/tmp/msr-record.pid"
RAW="$DIR/raw.mov"

case "${1:-}" in
  start)
    shift
    DISPLAY_ARG=()
    while [ $# -gt 0 ]; do case "$1" in
      --dir) DIR="$2"; RAW="$DIR/raw.mov"; shift 2 ;;
      --display) DISPLAY_ARG=(-D "$2"); shift 2 ;;
      *) shift ;;
    esac; done
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "already recording (pid $(cat "$PID_FILE"))" >&2; exit 1
    fi
    mkdir -p "$DIR"; rm -f "$RAW"
    screencapture -v "${DISPLAY_ARG[@]}" "$RAW" &
    echo $! > "$PID_FILE"
    echo "recording pid $(cat "$PID_FILE") -> $RAW"
    ;;
  stop)
    SLUG="${2:-demo}"
    [ -f "$PID_FILE" ] || { echo "no recording in progress" >&2; exit 1; }
    PID="$(cat "$PID_FILE")"
    # screencapture can ignore a single SIGINT, leaving a moov-less file — re-signal.
    for _ in 1 2 3 4 5; do
      kill -0 "$PID" 2>/dev/null || break
      kill -INT "$PID" 2>/dev/null || true
      sleep 1
    done
    rm -f "$PID_FILE"
    kill -0 "$PID" 2>/dev/null && { echo "recorder did not exit" >&2; exit 1; }
    [ -s "$RAW" ] || { echo "no recording produced — Screen Recording TCC grant missing?" >&2; exit 1; }
    OUT="$DIR/$SLUG.mov"
    if command -v ffmpeg >/dev/null; then
      ffmpeg -y -loglevel error -i "$RAW" -c copy -movflags +faststart "$OUT" && rm -f "$RAW"
    else
      mv "$RAW" "$OUT"
    fi
    echo "$OUT"
    ;;
  rect)
    APP="${2:?usage: record.sh rect \"App Name\"}"
    # Window rect is in points; desktop size lets render.sh convert to pixels.
    osascript <<OSA
tell application "System Events" to tell (first process whose name is "$APP")
  set {x, y} to position of front window
  set {w, h} to size of front window
end tell
tell application "Finder" to set {d1, d2, dw, dh} to bounds of window of desktop
do shell script "echo '{\"rect\":[" & x & "," & y & "," & w & "," & h & "],\"desktop\":[" & dw & "," & dh & "]}'"
OSA
    ;;
  stage)
    APP="${2:?usage: record.sh stage \"App Name\"}"
    osascript -e "tell application \"System Events\" to set visible of (every process whose visible is true and name is not \"$APP\" and name is not \"Finder\") to false" || true
    defaults write com.apple.finder CreateDesktop false; killall Finder
    echo "staged: only $APP + wallpaper visible (verify with a screenshot before recording)"
    ;;
  unstage)
    defaults write com.apple.finder CreateDesktop true; killall Finder
    echo "desktop icons restored"
    ;;
  *)
    sed -n '2,10p' "$0"; exit 1
    ;;
esac
