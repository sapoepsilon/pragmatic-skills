---
description: Use when producing privacy-safe QA or product-demo evidence from a local or remote macOS machine. Stages a clean desktop, routes signing and GUI capture through the logged-in Aqua session, reviews a screenshot and sampled video frames before upload, publishes through user-local storage configuration, comments on a PR, and restores the desktop even after failure.
---

# macos-screen-recorder

Produce trustworthy macOS QA evidence without exposing the operator's desktop, accounts, devices, notifications, reminders, or infrastructure.

The reusable workflow lives here. Machine-, project-, signing-, application-, and storage-specific facts live outside the plugin in a **local capture extension**. Never add real certificate names, team IDs, account IDs, bucket names, remote names, hostnames, dashboard URLs, device names, usernames, tokens, or private application paths to this repository.

## When to use

Use for:

- a remotely driven macOS QA recording;
- a signed build that must retain microphone, Accessibility, Screen Recording, or other TCC permissions;
- a product demo that will be attached to a PR, issue, release note, or external message;
- any capture from a personal or shared Mac where privacy review is mandatory.

Do not use for:

- covert or unattended capture without the machine owner's authorization;
- recording a locked or logged-out Mac;
- bypassing TCC, Keychain, signing, or access controls;
- uploading raw footage that has not passed screenshot and frame-sampling review.

## Local extension contract

Run `scripts/setup.sh` once. It creates:

```text
~/.config/macos-qa-capture/config.json
```

That file is the client-local extension. It is not synchronized back to this plugin or marketplace. Plugin updates synchronize reusable code; local values remain on the machine. A project may override non-secret settings with `.macos-qa-capture.json` and private settings with ignored `.macos-qa-capture.local.json` files.

The workflow reads these layers in order:

1. `~/.config/macos-qa-capture/config.json`
2. `<repo>/.macos-qa-capture.json`
3. `<repo>/.macos-qa-capture.local.json`

Later files override earlier files. Keep secrets in environment variables, Keychain, storage-tool configuration, or the ignored local file—not in committed JSON.

Read `references/configuration.md` before first use. Run:

```bash
scripts/macos-qa-capture.sh config
scripts/macos-qa-capture.sh preflight
```

Do not start capture until preflight identifies a usable GUI request directory and GUI capture command.

## Non-negotiable safety rules

1. **Aqua only.** SSH is orchestration, not capture. Send signed-install, screenshot, start, and stop requests to the configured LaunchAgent running in the logged-in GUI session. Never invoke `screencapture` directly from a plain SSH session.
2. **Signed identity.** Install through the configured signed QA command. Verify the installed bundle's identifier, signing authority/team when configured, and `codesign --verify --deep --strict`. Never launch unsigned or ad-hoc-signed builds when TCC continuity matters.
3. **No prompt storms.** A signing helper may retry only after classifying the error. If Keychain access needs human approval, stop after the configured attempt limit, surface the exact local action, and never loop password or authorization prompts.
4. **Clean desktop first.** Save Finder and widget preferences, enable Do Not Disturb, hide desktop icons/widgets, hide or quit unrelated apps, browsers, dashboards, chat clients, password managers, calendars, and notification centers. The target app and a neutral background should be the only visible content.
5. **Screenshot gate.** Take a staging screenshot through the GUI LaunchAgent and visually inspect it before video starts. If anything private or unrelated is visible, clean again and retake it.
6. **Review before upload.** Stop/finalize the video, generate a contact sheet, and visually inspect sampled frames. Raw or final footage containing reminders, device/host names, account IDs, email addresses, notifications, private dashboards, credentials, tokens, QR codes, personal files, or unrelated apps must never be uploaded.
7. **User-owned storage.** Upload only through the configured local uploader. The skill has no built-in account, bucket, remote, or destination. If storage is not configured, keep the approved artifact local and report that no evidence link was produced.
8. **Always restore.** Restore Finder/widget preferences and Focus state in a trap/finally path, including failed recordings. Do not leave the user's desktop modified.

## End-to-end workflow

### 1. Discover and preflight

From the repository being reviewed:

```bash
/path/to/skill/scripts/macos-qa-capture.sh config
/path/to/skill/scripts/macos-qa-capture.sh preflight
```

Confirm:

- the GUI user is logged in and the desktop is unlocked;
- required local commands exist;
- the LaunchAgent request directory is writable and its status/response directory is readable;
- signing and capture request commands are configured;
- artifact and privacy-review directories are outside the application repository;
- upload is either configured or explicitly local-only.

Completion criterion: preflight passes without printing secrets.

### 2. Signed QA installation

Run the configured install request through the LaunchAgent:

```bash
scripts/macos-qa-capture.sh install
scripts/macos-qa-capture.sh verify-signature
```

If signing fails, use `references/signing-and-aqua.md`. Distinguish:

- missing identity/certificate;
- locked Keychain;
- private-key ACL or user-presence prompt;
- wrong identity or changed bundle identifier;
- unsigned nested code;
- stale build or stale LaunchAgent response.

Do not repeatedly invoke signing while a prompt is pending. Completion criterion: the installed app passes strict signature verification and matches all configured identity expectations.

### 3. Stage the desktop

```bash
scripts/macos-qa-capture.sh stage
```

The command snapshots preferences before changing them. Then independently verify that unrelated apps are hidden or quit. Prefer a dedicated QA macOS user or clean Space when possible. Never navigate through private dashboards or personal communications while recording.

Completion criterion: only the target app, neutral wallpaper/background, Dock/menu bar elements required for the demo, and intentionally demonstrated system UI are visible.

### 4. Screenshot privacy gate

```bash
SHOT=$(scripts/macos-qa-capture.sh screenshot staging)
printf '%s\n' "$SHOT"
```

Load and visually inspect the actual image. Check every edge, the menu bar, Dock, desktop, notifications, title bars, sidebars, and any system sheet. Do not infer safety from filenames or command success.

Reject and restage if the screenshot reveals:

- reminders, tasks, calendar entries, messages, notifications, or contacts;
- device names, hostnames, usernames, email addresses, account/team/customer IDs;
- private dashboards, analytics, issue trackers, admin consoles, cloud panels;
- secrets, tokens, QR codes, recovery codes, API keys, or signing details;
- unrelated browser tabs, app windows, files, folder names, mounted volumes, or recent items.

Completion criterion: a human or vision-capable reviewer explicitly approves the staging screenshot.

### 5. Record through the GUI LaunchAgent

```bash
scripts/macos-qa-capture.sh start demo-slug
# Drive only the acceptance-test flow.
VIDEO=$(scripts/macos-qa-capture.sh stop demo-slug)
```

Start after the app is at the flow entry point. Stop after the final assertion is visible. Avoid builds, loading waits, login screens, credentials, provisioning, and unrelated navigation. Keep the recording short and deterministic.

Completion criterion: the finalized video exists, is non-empty, and has a readable duration.

### 6. Sample and privacy-review the video

```bash
SHEET=$(scripts/macos-qa-capture.sh contact-sheet "$VIDEO")
printf '%s\n' "$SHEET"
```

The helper uses the configured contact-sheet command, or `ffmpeg`/`ffprobe` when available. Review the contact sheet visually. For long recordings, suspicious transitions, overlays, or notification risk, inspect additional frames around those timestamps.

If anything private appears:

1. do not upload;
2. delete or quarantine both raw and rendered artifacts according to local policy;
3. clean the desktop;
4. recapture from the beginning.

Cropping or blurring is not the default fix because it can miss a single leaked frame. Recapture unless the operator explicitly approves redaction and every frame is re-reviewed.

Completion criterion: sampled frames are explicitly approved and no unreviewed footage is selected for upload.

### 7. Upload through local storage configuration

```bash
LINK=$(scripts/macos-qa-capture.sh upload "$VIDEO")
printf '%s\n' "$LINK"
```

The local configuration may use R2, S3, GCS, Azure, a company artifact service, or no remote storage. For an rclone-backed object store, configure an upload template and link template locally. A seven-day link can be requested with `167h`, leaving one hour of margin under a 168-hour service limit.

Never print the storage configuration or credentials into the PR. Completion criterion: the returned URL is reachable, expires according to local policy, and points to the privacy-reviewed artifact—not the raw capture.

### 8. Comment on the PR

Render `templates/pr-comment.md` with real results. The comment must distinguish pass, fail, blocked, and skipped states. Include:

- signed build/install result;
- build command/result;
- test command/result;
- exact flow verified;
- staging screenshot review result;
- sampled-frame privacy review result;
- expiring evidence URL and expiry, or `not uploaded`;
- relevant limitations or failures.

Never claim tests, visual review, upload, or signature verification succeeded without checking them.

### 9. Restore and clean up

```bash
scripts/macos-qa-capture.sh restore
```

Restore also runs automatically on normal workflow failures, but invoke it explicitly before reporting completion. Remove raw full-screen footage after the approved final artifact and link are verified, unless local retention policy requires quarantine.

Completion criterion: Finder/widget/Focus state is restored and no recording process or stale request remains.

## PR comment example

```markdown
## QA evidence

| Gate | Result |
| --- | --- |
| Signed QA install | Pass — strict signature verification succeeded |
| Build | Pass — `<redacted command summary>` |
| Tests | Pass — `<suite summary>` |
| Flow | Pass — `<observable acceptance flow>` |
| Staging screenshot review | Pass — clean desktop, no unrelated content |
| Video privacy review | Pass — sampled contact sheet reviewed |
| Evidence | [Expiring recording](<url>) — expires `<timestamp>` |

Notes: `<limitations or none>`
```

## Common pitfalls

- **Treating SSH as a GUI session.** Remote shell success does not grant Aqua/TCC access. Use the LaunchAgent request bridge.
- **Hardcoding one person's infrastructure.** Storage, certificates, paths, bundle IDs, and request protocols belong in local configuration.
- **Blindly trusting app-only crop.** Notifications, menus, sheets, and transitions can escape the crop. Stage and review the full screenshot and sampled video.
- **Restoring to guessed defaults.** Save exact prior preferences; do not always force icons/widgets back on.
- **Looping codesign.** Repeated retries can create Keychain prompt storms and train users to approve blindly. Classify once, stop, and ask for the minimal local action.
- **Uploading the first output path.** Confirm it is finalized, reviewed, and the intended post-processed artifact.
- **Assuming a contact sheet proves every frame.** Increase sampling around transitions or inspect the video manually when risk is elevated.

## Verification checklist

- [ ] No personal or organization-specific values are committed in the plugin.
- [ ] Local layered configuration resolves without exposing secrets.
- [ ] Signed installation ran in the Aqua session and strict verification passed.
- [ ] Desktop state was snapshotted before staging.
- [ ] Unrelated apps, browsers, dashboards, widgets, icons, and notifications were hidden.
- [ ] Staging screenshot was visually reviewed and approved.
- [ ] Recording used the GUI LaunchAgent rather than direct SSH capture.
- [ ] Contact sheet/additional frames were visually reviewed and approved.
- [ ] Only the approved artifact was uploaded through user-owned storage.
- [ ] Evidence link expiry was verified.
- [ ] PR comment reports real build/test/privacy results.
- [ ] Finder/widget/Focus state was restored.
- [ ] Raw sensitive footage was deleted or handled by local retention policy.
