---
name: macos-screen-recorder
description: Record the macOS screen or a specific app and render it Screen-Studio-style — framed on a wallpaper/gradient background with rounded corners and optional zoom-on-demand segments — using only screencapture + ffmpeg (no GUI tools). Use for product demo videos, QA evidence recordings, or whenever asked to "record the screen/app" on a Mac, locally or on a remote Mac runner over SSH. Trigger keywords: screen recording, record the app, demo video, framed recording, zoom on clicks, qa recording.
---

# macos-screen-recorder

Two scripts, both in `scripts/` next to this file:

- `record.sh` — stage a clean desktop, capture with `screencapture -v`, grab an app's window rect
- `render.sh` — pure-ffmpeg post-processing: crop to the app, composite onto a background with padding + rounded corners, apply zoom segments

Copy them to the target Mac (or run in place). Requires `ffmpeg` on the machine doing the render (render can run anywhere, including Linux — only capture needs the Mac).

## Prerequisites (capture Mac)

- **Screen Recording TCC grant** for the invoking context. Over SSH, `screencapture` runs in a Background (non-Aqua) session and fails — run capture through a LaunchAgent in the user's GUI session (request-file pattern) and grant Screen Recording to it once. An unlocked, active GUI session is required.
- Synthetic keystrokes/clicks to drive the app need Accessibility for the invoking process.
- TCC permission dialogs **cannot** be dismissed by synthetic events. If one appears on first launch of a freshly signed build, stop and report it as a one-time manual grant — don't record it.

## The flow

```bash
# 0. stage: only the app + wallpaper visible (NEVER skip on a personal Mac — captures
#    of real desktops with browsers/dashboards in frame are a privacy incident)
./record.sh stage "MyApp"
# take a screenshot and LOOK at it — verify nothing personal is visible before rolling

# 1. app window rect (points + desktop size; render.sh converts to retina pixels)
./record.sh rect "MyApp" > rect.json

# 2. record
./record.sh start
#   ... drive the app (osascript keystrokes, clicks, `say` for dictation demos) ...
MOVIE=$(./record.sh stop my-demo)

# 3. restore the desktop
./record.sh unstage

# 4. render: framed on a background, cropped to the app, zoom where it matters
./render.sh "$MOVIE" demo-final.mp4 \
  --rect-json rect.json \
  --bg '#0e1726' \            # or /path/wallpaper.jpg, or omit for a built-in gradient
  --pad 8 --radius 24 \
  --zoom 12,3,640,400,1.8     # at t=12s, for 3s, zoom 1.8x centered on (640,400)
```

## render.sh options

| flag | meaning |
| --- | --- |
| `--rect x,y,w,h` | crop region in pixels (skip to frame the whole screen) |
| `--rect-json FILE` | output of `record.sh rect` — handles retina point→pixel scaling |
| `--bg VALUE` | `#hex` color, image path, or `gradient` (default) |
| `--pad PCT` | margin percent (default 8) |
| `--radius PX` | rounded corners, `0` to disable (default 24) |
| `--zoom t,dur,x,y,scale` | zoom segment; repeatable; x,y in content pixels after crop; 0.5s ease in/out |
| `--size WxH` / `--fps N` | output size (default input) / fps (default 30) |

Zoom coordinates: since the agent drives the clicks itself, it knows exactly when and
where to zoom — log `(t, x, y)` while driving and turn each interaction worth
highlighting into a `--zoom` argument. Full-screen effects (edge glows, overlays) should
be rendered WITHOUT crop/zoom — the edges are the demo.

## QA integration

Upload the rendered file to object storage and share a presigned link (works as plain
text in PR comments, Telegram, Linear). Delete raw captures after rendering — raw
full-screen footage is the risky artifact.

## Honest limits

- No cursor-smoothing or click-ripple effects (that's Screen Studio territory, GUI-only).
- Zoom applies to the composited frame, so the background zooms with the content.
- `screencapture -v` records one display; multi-display picks with `record.sh start --display N`.
