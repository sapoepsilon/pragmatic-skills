---
name: mobile-qa
description: Stage 3 of the mobile auto-shipper — QA. Loop to drive the REAL app on a real simulator/emulator (iOS sim on Mac, Android emulator MCP, adb, Figma MCP bridge) against the real non-prod backend on a throwaway user, record the run, and verify the change. On pass, hand to ship; on failure, bounce a specific report back to implement. Use after mobile-implement reports a build is ready.
---

# mobile: qa (stage 3 of 3)

Goal: prove the change actually works by driving the **real app on a real device** against a **real, non-production** backend — not by reading the diff. Record the run so the dev can review it.

## Preconditions (from setup; assume, don't install)

- A device/QA target for `qa.device`: **iOS simulator** (Mac, via `xcrun simctl` / the iOS MCP) or the **Android emulator MCP** (`mcp__mobile__*`). `adb` for direct Android control. **Figma MCP bridge** (Mac-only) for design-parity checks during QA.
- Backend at `backendUrl` that is **non-prod** with migrations applied. Refuse to run if it looks like production. Use a throwaway user.

## Loop

1. Install/launch the built app on the target device (`mcp__mobile__mobile_install_app` / `mobile_launch_app`, or simctl).
2. Drive the exact flow the confirmed intent describes — tap/type/swipe via the device MCP; assert the observable result. If a design was referenced, compare against Figma via the bridge.
3. **Record** the run (`mobile_start_screen_recording` / stop, or simctl recording) and save the artifact path to run-state.
4. Decide pass/fail against the intent's acceptance criteria. Reuse / extend `verify-to-e2e` to codify the check as a durable test where it makes sense.

## Handoff contract

- **Pass** → write verdict + recording path to run-state, hand off to ship (PR + install). Notify the dev with the recording.
- **Fail** (couldn't verify, or behavior is wrong) → bounce **back to `mobile-implement`** with a precise prompt: *"QA failed at [step]: expected [X], saw [Y]. Recording: [path]. Fix and return."* Increment the iteration count; if the loop budget is exceeded, stop and escalate to the dev instead of bouncing again.
- The dev may say *"skip QA, I'll verify myself"* — only then bypass this stage and hand implement straight to ship. Default is always QA on.

Never run against production. Never declare pass without having actually driven the app.
