Verify a feature by driving the real running app, then turn that verification into a durable end-to-end test. Recording the run is out of scope.

Target: $ARGUMENTS

Run two phases:

1. VERIFY
   - Write the acceptance criteria first: entry point (screen/route/URL/endpoint), the action(s), and the expected end state (screen, route, response, side effect, signed out, …). These become the test's assertions.
   - Drive the real running system with whatever automation is available (iOS sim via `xcrun simctl`, Android via `adb`, a browser/Playwright, curl/HTTP). Reach the entry point, exercise the flow as a user/caller would, and observe every step (screenshots, logs, console, responses) until the end state matches the criteria.
   - Do not type real passwords into login fields. Use the project's test account through its sanctioned automated path (mint a token / use a fixture rather than UI login).
   - If it misbehaves, fix the code first — don't write a test around a bug.

2. CODIFY
   - Discover the project's test conventions before writing anything: the test dir, the runner (e.g. `flutter test`, Playwright, Cypress, pytest, `npm run e2e`, a `run_e2e.sh`), and how existing tests authenticate, seed data, and assert. Mirror them.
   - Write a test that replicates the manual verification and asserts the same observable outcomes. Authenticate via the project's test helper, not by hand-typing secrets.
   - Wire it into the runner / test list; register onboarding- or auth-gated tests where the harness seeds state and uses an ephemeral test user.
   - Run it until green, then once more to confirm it isn't flaky.

Watch for: scope error-swallowing so the test doesn't die on unrelated noise (a layout overflow shouldn't fail a navigation test); perpetual spinners that prevent settling (usually a down dependency — fix it); state touched after an async sign-out/navigation (guard with a mounted/alive check — a real bug to fix); flaky cold backends (warm the real path first, add a small retry); degraded long-lived simulators (cold-restart); and clean up ephemeral test state.

Hand back: what you verified (with evidence), the test you added and where it's wired, the run result, and any real bugs the codification surfaced.
