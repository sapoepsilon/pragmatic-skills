Use the repository's `macos-screen-recorder` workflow to produce privacy-safe macOS QA evidence for: $ARGUMENTS

First load the skill's `SKILL.md` and its configuration/signing references. Use the client-local layered configuration rather than hardcoding application, signing, host, account, storage, bucket, device, or dashboard details.

Requirements:

1. Run signed QA installation and capture through the configured LaunchAgent in the logged-in Aqua session. Never run `screencapture` directly from plain SSH.
2. Bound signing retries and stop on Keychain authorization errors; do not create password or approval prompt storms.
3. Snapshot desktop preferences, hide widgets/icons/unrelated apps/browsers/dashboards, and enable the configured notification-suppression path.
4. Take a staging screenshot through the GUI bridge and visually inspect the actual image before recording.
5. Record only the acceptance-test flow, then finalize the video.
6. Generate and visually inspect a contact sheet plus extra frames around risky transitions.
7. Never upload footage containing reminders, notifications, device/host names, usernames, email addresses, account IDs, credentials, QR codes, private dashboards, or unrelated content.
8. Upload only through user-owned local storage configuration. If none is configured, report the approved local path rather than inventing a destination.
9. Produce the PR evidence comment with real signed-install, build, tests, flow, screenshot-review, video-review, link, and expiry results.
10. Restore Finder/widget/Focus state in a finally/trap path even on failure.

Do not claim capture, review, upload, signing, tests, or restoration succeeded without verifying each result.
