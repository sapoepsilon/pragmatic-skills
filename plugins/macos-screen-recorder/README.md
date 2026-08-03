# macos-screen-recorder

Privacy-safe macOS QA and product-demo evidence capture for local or remotely orchestrated Macs.

The skill requires capture and signed installation to run through a user-owned LaunchAgent in the logged-in Aqua session. It stages a clean desktop, requires visual review of a staging screenshot and sampled video frames, uploads only through user-local storage configuration, and restores Finder/widget preferences after capture.

## Install

```text
/plugin marketplace add sapoepsilon/pragmatic-skills
/plugin install macos-screen-recorder@pragmatic-skills
```

Or install the complete bundle:

```text
/plugin install pragmatic@pragmatic-skills
```

Invoke as:

```text
/macos-screen-recorder:macos-screen-recorder
```

The bundle exposes it as:

```text
/pragmatic:macos-screen-recorder
```

## First-run setup

Run the setup script from the installed plugin/skill directory:

```bash
./scripts/setup.sh
```

It creates a private client extension at:

```text
~/.config/macos-qa-capture/config.json
```

Plugin updates synchronize reusable instructions and scripts, **not** that local file. Put your own application, LaunchAgent request protocol, signing expectations, artifact paths, and storage commands there. Do not commit credentials, bucket names, certificate details, device names, account IDs, or private paths to this repository.

See [`references/configuration.md`](./skills/macos-screen-recorder/references/configuration.md) for layered machine/project configuration and generic R2/S3/rclone examples.

## Hermes Agent

Install the same skill tree into the active Hermes profile:

```bash
node hermes/install.mjs
```

Then run `/reload-skills` or start a new Hermes session. The installer copies only the reusable skill directory. The machine-local capture extension under `~/.config/macos-qa-capture/` stays outside Hermes skills and is never synchronized into the repository.

## Safety model

- Capture never runs directly from plain SSH; SSH only submits requests to the Aqua-session LaunchAgent.
- Signing retries are bounded to prevent Keychain prompt storms.
- A clean-desktop screenshot must be visually approved before recording.
- A video contact sheet and any risky transitions must be visually approved before upload.
- Footage containing reminders, notifications, device names, account IDs, email addresses, credentials, private dashboards, or unrelated apps must not be uploaded.
- User-owned storage is optional and locally configured. The plugin ships no account, bucket, token, or remote.
- Finder/widget/Focus preferences are restored from a saved snapshot, not guessed defaults.

## Requirements

- macOS with an active, unlocked GUI user session
- a per-user LaunchAgent bridge configured by the operator
- Screen Recording permission for the actual GUI capture helper
- Accessibility permission only when the QA driver needs synthetic input
- `python3`, `codesign`, `defaults`, and `osascript`
- `ffmpeg` + `ffprobe`, or a configured contact-sheet command
- optional credential-aware uploader such as `rclone`, `aws`, `gcloud`, or an internal artifact CLI

No credentials or private infrastructure are included.
