# pragmatic

Bundle plugin: installs every skill in the [pragmatic-skills](https://github.com/sapoepsilon/pragmatic-skills) registry at once.

## Install

```
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install pragmatic@pragmatic-skills
```

## What you get

Skills in this bundle are also distributable as individual plugins — if you only want one, install it directly (e.g. `/plugin install muchotexto@pragmatic-skills`) and skip the bundle.

| Skill | Description |
| --- | --- |
| [muchotexto](../muchotexto) | Compress responses to the tightest faithful length. |
| [vault-session](../vault-session) | Save and resume Claude Code session notes through an Obsidian vault. |
| [mobile](../mobile) | Mobile autoship stages (analyze → implement → QA), setup, verify-to-e2e, and mobile-comprehensive-review. |
| [backend-comprehensive-review](../backend-comprehensive-review) | Multi-agent end-to-end backend/API PR review with runtime verification. |
| [macos-screen-recorder](skills/macos-screen-recorder) | Record the Mac screen or an app and render it framed on a background with zoom segments (screencapture + ffmpeg). |

## Codex users

This bundle is Claude Code only. Codex prompts are per-skill — see each skill's individual plugin directory for its `codex/` folder.
