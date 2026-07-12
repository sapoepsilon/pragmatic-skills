---
name: verify-to-e2e
description: Verify a new or changed feature by driving the real running app (iOS/Android simulator, browser, CLI, or API) via MCP or the project's own automation, then codify that exact check into a reusable end-to-end test wired into the project's existing test harness. Use after building something you were asked to "verify" / "test in the simulator / app", or whenever you want to turn a manual walkthrough into a durable automated test. Works for any stack — mobile, web, desktop, backend. Recording the run is a separate concern; do not record here.
---

# verify-to-e2e

Two phases: **(1) verify** the feature by driving the real running system, then
**(2) codify** that verification into an automated end-to-end test that asserts the
same thing. The manual check is the spec; the test is the durable artifact.

> Recording the run (video/GIF) is **out of scope** here — that's a separate skill.
> Just verify, then codify.

## When to use
- After implementing a feature and being asked to "verify it works" / "test it in the app".
- When you've manually driven a flow (via MCP, a browser, a simulator, curl) and want it captured as a repeatable test.
- **Not** for pure logic that a unit test covers directly — this is for user-facing or integration-level flows that need the real app/system (and often a backend).

## Phase 0 — Pin down what "works" means
Before touching anything, write the **acceptance criteria** as concrete, observable
outcomes: the entry point (screen / route / URL / endpoint), the action(s), and the
expected end state (screen shown, route, toast, response body, row written, email
sent, signed out, …). These become the test's assertions. Vague criteria → vague test.

## Phase 1 — Verify by driving the real system
Use whatever automation the environment gives you. Common drivers:
- **Mobile** — iOS sim (`xcrun simctl` launch/openurl/screenshot), Android emulator (`adb`, `adb shell am start … -d <url>`, `adb logcat`), or a mobile MCP server.
- **Web** — a browser MCP, Playwright/Puppeteer, or headless Chrome; read the console + network.
- **Backend / CLI** — `curl`/HTTP client, the CLI itself; assert on status, body, side effects.

Steps:
1. Get the thing built and running.
2. Reach the entry point and exercise the flow exactly as a user/caller would.
3. **Observe every step** (screenshot, logs, console, response). Confirm the end state matches the Phase 0 criteria.
4. If it misbehaves, **fix the code first** — don't write a test around a bug (unless the test is the regression guard for a bug you're about to fix).

**Auth:** never type real passwords into login fields, and never paste secrets where
they'll be logged. Use the project's test/QA account and its sanctioned automated path
(see Phase 2). For a one-off authenticated session during manual verification, prefer
minting a token through the project's test-auth helper / API over UI login.

## Phase 2 — Codify into an end-to-end test
1. **Discover the project's conventions first — never invent a new pattern.**
   - Find the test dir and runner: `integration_test/` + `flutter test`, `e2e/`/`tests/` + Playwright/Cypress, `*_test.go`, `detox`, `pytest`, an `npm run e2e` / `scripts/run_e2e.sh`, etc.
   - Read one or two existing E2E tests: how they authenticate, seed data, reach the screen/endpoint, and assert. Mirror them.
2. **Write the test** to replicate Phase 1 and assert the Phase 0 criteria. Authenticate via
   the project's test helper (e.g. a `signIn(...)` that drives the form through the test
   framework, or a fixture that injects a session) using CI creds from env / `--dart-define` /
   a `.env.test`. That's test code — not you hand-typing a password.
3. **Wire it in**: add it to the runner and any test list/config. If it's gated behind
   auth/onboarding, register it where the harness seeds the required state and uses an
   ephemeral test user.
4. **Run it until green, then run once more** to confirm it isn't flaky.

The test must assert the **same observable outcomes** you confirmed by hand. If you only
checked "it navigates", assert the destination. If you checked "the row was deleted and
the user was signed out", assert both.

## Gotchas (stack-agnostic, learned the hard way)
- **Test the behavior you verified, at the right altitude.** A navigation/flow test should
  not fail on unrelated noise (a layout overflow, a cosmetic warning). Scope error handling
  to swallow only the irrelevant class and keep everything else fatal — and let the layer
  that owns that concern (e.g. a dedicated layout test) cover it.
- **Spinners that never stop wedge the test.** A widget/element stuck in a perpetual loading
  state (often because a dependency is down) prevents the UI from settling and breaks
  teardown or hangs the runner. It's usually a *symptom* — fix the unmet dependency, don't
  paper over it.
- **Lifecycle after async.** A flow that signs out / navigates away tears down the current
  view; touching its state after the `await` (e.g. `setState`, accessing a stale element)
  throws. Guard with an "is this still mounted/alive?" check. Tests surface these real bugs —
  fix them.
- **Flaky / cold environments.** Free-tier or just-started backends return transient 5xx
  (a health check may be 200 while the heavy authenticated path 502s when cold). **Warm the
  real path first** (hit it until consistently green) and add a **small retry** in the test
  to absorb transient failures. Don't confuse "environment was cold" with "feature is broken".
- **Degraded long-lived devices.** Simulators/emulators get slow after hours of runs (startup
  timeouts, ANRs, port collisions). Cold-restart to a clean state and keep a single instance.
- **Clean up ephemeral state** the test creates (users, rows, files) — usually on the runner's
  exit hook so it runs even on failure.
- **Re-discover, don't assume.** Recalled paths/helpers/scripts may be stale; verify the test
  dir, helper names, and run command still exist before relying on them.

### Worked example (Flutter + go_router)
- Drive navigation the way the app does (e.g. `router.go(parsedLocation)`); capture the
  `GoRouter` **once** from a stable context and reuse it (re-looking it up mid-transition
  throws "deactivated widget's ancestor"). Assert on the current route path **plus** a screen widget.
- Auth via the project's `integration_test/helpers.dart`: `bootApp` → `signIn(tester, email, password)`
  (CI creds from `--dart-define`) → `dismissConsentDialogs`. Run with
  `E2E_DEVICE_ID=<device> ./scripts/run_e2e.sh integration_test/<your>_test.dart`; register
  onboarding-gated tests in the harness's seeded-user list.

## Hand back
Report: what you verified by hand (with evidence), the test you added + where it's wired,
the result of running it, and **any real bugs the codification surfaced** — these are common,
because writing the test exercises edge paths the happy-path demo skips.
