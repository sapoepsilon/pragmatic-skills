---
name: mobile-qa
description: Stage 3 of the mobile auto-shipper — drive the real app/API on a real non-prod target (iOS/Android simulator, physical device, browser, CLI/API), verify backend/Supabase integration, record evidence when possible, and either pass to ship or bounce a precise failure back to implementation. Use after mobile-implement reports a build is ready.
---

# mobile: qa (stage 3 of 3)

Goal: prove the change actually works by driving the **real running system** against a **real, non-production** backend/Supabase target — not by reading the diff. Record evidence so the developer can review it.

## Preconditions

- A device/QA target is explicit: iOS simulator, Android emulator, physical Android device, browser, CLI/API, or mobile MCP.
- Backend and Supabase URLs are non-prod. Refuse production-looking URLs.
- Use throwaway/seed QA users only. Do not paste real passwords where they will be logged.
- Staging/Supabase reset is destructive and requires explicit user approval.

## Loop

1. **Install/launch or start the target.** For Android, install the built APK with `adb -s <serial> install -r -g <apk>` and launch the package. For API/backend, start/call the real non-prod service.
2. **Record evidence.** Use mobile MCP recording, `adb shell screenrecord`, project helpers, screenshots, browser console/network logs, or terminal/API output as appropriate.
3. **Drive exact acceptance criteria.** Tap/type/swipe via device tools, use browser tools, or call APIs with `curl`/project clients. Observe the end state directly.
4. **Verify integration.** When the flow crosses layers, check the mobile UI/API response plus backend logs/state and Supabase-auth/data reachability.
5. **Pass/fail honestly.** On failure or blocked verification, bounce to `mobile-implement` with step, expected, actual, logs/screenshots/recording path, and whether retry/reset is safe.
6. **Codify if useful.** Use `verify-to-e2e` when the manual flow should become a durable test.

## Kentra references

- Android package: `com.kentra.app`
- APK: `/home/ubuntu/kentra-mobile/build/app/outputs/flutter-apk/app-debug.apk`
- Emulator default serial: `emulator-5554`
- Physical Pixel serial: `100.114.162.40:5555`; use only when requested and always target explicitly with `adb -s 100.114.162.40:5555`.
- If the Pixel is unreachable, ask the user to wake/unlock it and verify Tailscale + Wireless debugging; do not silently fall back to emulator.
- Recording helpers: `/home/ubuntu/record-start.sh`, `/home/ubuntu/trim.sh`
- Backend QA endpoints: LAN `http://192.168.50.67:3001`, Tailscale `http://100.69.20.48:3001`, health path `/api/v1/health`.
- Supabase QA endpoints: LAN `http://192.168.50.67:54321`, Tailscale `http://100.69.20.48:54321`; verify `/auth/v1/health` or `/rest/v1/`.

## Guardrails

- Never run QA against production.
- Never declare pass without actually driving the app/API and checking observable output.
- Never reset staging/Supabase without explicit approval.
- Never substitute emulator QA when the user requested the physical Pixel without clearly reporting the blocker and getting approval.
