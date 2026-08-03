---
name: loopcopy
description: Turn what you are working on or brainstorming right now into one self-contained `/loop` command and put it on the clipboard, so it can be pasted into a fresh session on any machine (macOS, Windows, Linux, WSL, SSH) and run on a schedule. Use when the user says "loopcopy", "make me a loop command", "copy a loop for this", "turn this into a loop I can paste", or asks to hand the current work off to a recurring or self-paced background session. Do NOT use to start a loop in this session — that is `/loop`.
---

# loopcopy — package this work as a pasteable `/loop`

You are a **packager**, not the executor. The deliverable is exactly one `/loop …` command that:

1. is on the system clipboard,
2. is printed in a fenced block in your reply,
3. is saved to a file (clipboards get overwritten),
4. **stands completely alone** — it will run in a fresh session that has never seen this conversation.

Never start the loop here unless the user explicitly asks.

---

## Step 1 — Harvest context (fast, no questions yet)

Budget ~5 tool calls. Do not spawn subagents or run broad searches.

- **This conversation is the primary source.** What has the user been building, debugging, or brainstorming? What did they say they want to keep happening?
- If in a git repo: `git rev-parse --show-toplevel`, `git branch --show-current`, `git status --short`, `git log --oneline -5`.
- Identifiers already mentioned: ticket IDs (`WHI-123`), PR/issue numbers, URLs, service names, hostnames, plan or progress files.
- Project conventions worth carrying: build/test command from `CLAUDE.md`, `package.json`, `Makefile`, or the repo README.

## Step 2 — Fill the six slots; ask only about real gaps

| Slot | What it pins down |
|---|---|
| **OBJECTIVE** | The one outcome the loop is chasing, in a sentence |
| **CADENCE** | Fixed interval, or self-paced (see Step 3) |
| **EACH RUN** | The concrete procedure one iteration performs |
| **STOP** | The condition that ends the loop |
| **GUARDRAILS** | What it must never do unattended |
| **WHERE** | Absolute repo path, branch, machine/OS the loop will run on |

Fill every slot you can from Step 1. Then ask **at most 3** questions with `AskUserQuestion`, one per still-unresolved slot — and make your inferred answer the first option, labelled `(Recommended)`. Never ask for something you could have looked up. If all six are confidently inferable, ask nothing and go straight to Step 4.

`STOP` is the slot people forget. A loop with no stop condition runs until it is cancelled by hand — if the user genuinely wants that (a permanent watcher), write it down as `Stop: only when I cancel it.` so it is a decision, not an oversight.

## Step 3 — Interval or dynamic

**Fixed interval** — the work is periodic and cheap, and the right gap is known ("check the deploy every 10m"). Becomes a cron job.
**Dynamic** (no interval) — pacing depends on what the run observes, or the next run is gated on an event (CI finishing, a PR comment, a log line). The model self-paces and can arm a monitor. Prefer this when in doubt about cadence.

`/loop` parses its input in this order:

1. leading token matching `^\d+[smhd]$` → that is the interval (`/loop 5m run the tests`)
2. else a trailing `every <N><unit>` / `every <N> <unit-word>` → interval, stripped from the prompt (`/loop run the tests every 5 minutes`)
3. else → no interval → dynamic mode

Interval → cron:

| Interval | Cron | Notes |
|---|---|---|
| `Nm`, N ≤ 59 | `*/N * * * *` | every N minutes |
| `Nm`, N ≥ 60 | `0 */H * * *` | H = N/60, must divide 24 |
| `Nh`, N ≤ 23 | `0 */N * * *` | every N hours |
| `Nd` | `0 0 */N * *` | every N days at local midnight |
| `Ns` | treat as `ceil(N/60)m` | cron floor is 1 minute |

Intervals that do not divide their unit cleanly (`7m`, `90m`) give uneven gaps or are inexpressible — round to the nearest clean value and tell the user what you rounded to. Recurring cron loops auto-expire after ~30 days; mention it if the user expects a long-lived watcher.

## Step 4 — Compose the payload

The payload runs with **zero memory of this session**. Write it for a stranger.

**Required shape** (single line, sections separated by `.` / `;`):

```
/loop <interval?> <ROLE+OBJECTIVE sentence>. Repo: <ABSOLUTE PATH> (branch <branch>). Each run: 1) read <ABSOLUTE LEDGER PATH> to see what previous runs already did; 2) <step>; 3) <step>; 4) append a dated one-line entry to that ledger. Guardrails: <...>. Stop when <...> — say so and stop looping.
```

**Rules, in priority order:**

- **Absolute paths only.** No "the file we were looking at", no `./src`, no pronouns pointing at this conversation.
- **Carry a ledger.** Name an absolute file the loop reads first and appends to last. Without it every iteration redoes iteration one. Good default: `<repo>/plans/loop-<slug>.md` (or any gitignored dir the project already uses).
- **Name the commands.** Real build/test/deploy invocations, exactly as this project runs them.
- **Guardrails are explicit and negative.** Default set unless the user says otherwise: *do not push, force-push, merge, deploy, delete branches, or touch main; report and wait instead.*
- **No secrets.** Tokens, keys, passwords, private URLs — never. This goes on a clipboard and possibly into a shared paste.
- **Portability.** If the loop will run on a machine other than this one, keep shell commands appropriate to that OS. Do not bake `pbcopy`/`open` into a payload destined for Windows.
- **One line** unless it exceeds ~1500 characters. Some terminals submit multi-line pastes at the first newline. If it must be multi-line, warn the user to paste it into a fresh prompt buffer.
- **Target length 400–1200 characters.** Shorter than 400 usually means the payload is too vague to act on twice.

**Two parse traps to check for:**

- The prompt must not *start* with a token like `5m` or `2h` — it would be eaten as the interval. Reword ("spend five minutes…" → "briefly…").
- The prompt must not *end* with `every <time>` unless that is the cadence. `…summarise the results every 30 minutes` will be parsed as an interval and stripped. Move the phrase or rephrase.

**Worked examples**

Interval:

```
/loop 15m Babysit the open PRs for the whispera repo. Repo: /Users/uzi/Developer/whispera (branch main). Each run: 1) read /Users/uzi/Developer/whispera/plans/loop-pr-babysit.md for prior runs; 2) run `gh pr list --state open --json number,title,statusCheckRollup`; 3) for any PR whose checks went red since the last run, read the failing job log and post a one-paragraph diagnosis as a PR comment; 4) append a dated line per PR touched to that ledger. Guardrails: never push, merge, close, or re-run workflows — comment only. Stop when no open PR has been red for two consecutive runs, and tell me.
```

Dynamic:

```
/loop Drive the WHI-88 onboarding perf work to a green build. Repo: /Users/uzi/Developer/whispera (branch sapoepsilon/onboarding-idle-cost). Each run: 1) read /Users/uzi/Developer/whispera/plans/loop-whi88.md for the current state; 2) run `xcodebuild -scheme Whispera -project Whispera.xcodeproj build`; 3) fix the top compile error or the top item still open in the ledger; 4) append what you changed and what is still failing. Pace yourself: iterate right away while errors remain, and back off to a long fallback once the build is green and you are only waiting on my review. Guardrails: commit to the feature branch only — no push, no PR, no touching main. Stop when the build is green and the ledger has no open items.
```

## Step 5 — Copy it, cross-platform

Write the payload to a file first — piping through a shell string mangles quotes and newlines.

```bash
mkdir -p ~/.claude/loopcopy
f=~/.claude/loopcopy/$(date +%Y%m%d-%H%M%S)-<slug>.txt
# write the payload into "$f" with the Write tool, then:
if   command -v pbcopy            >/dev/null 2>&1; then pbcopy < "$f"
elif command -v wl-copy           >/dev/null 2>&1; then wl-copy < "$f"
elif command -v xclip             >/dev/null 2>&1; then xclip -selection clipboard -in "$f"
elif command -v xsel              >/dev/null 2>&1; then xsel --clipboard --input < "$f"
elif command -v clip.exe          >/dev/null 2>&1; then clip.exe < "$f"
elif command -v clip              >/dev/null 2>&1; then clip < "$f"
elif command -v termux-clipboard-set >/dev/null 2>&1; then termux-clipboard-set < "$f"
elif command -v powershell.exe    >/dev/null 2>&1; then powershell.exe -NoProfile -Command "Set-Clipboard -Value (Get-Content -Raw '$f')"
else echo NO_CLIPBOARD; fi
```

- **Native Windows** (PowerShell, no POSIX shell): `Get-Content -Raw <file> | Set-Clipboard`. From `cmd`: `clip < <file>`.
- **WSL / Git Bash**: `clip.exe` is on `PATH` and is the right target — it writes the Windows clipboard.
- **Remote / SSH with no clipboard binary**: try OSC 52, which pushes through the terminal emulator (iTerm2, kitty, WezTerm, Ghostty, and tmux with `set-clipboard on`):
  ```bash
  printf '\033]52;c;%s\a' "$(base64 < "$f" | tr -d '\n')" > /dev/tty
  ```
  Inside tmux, wrap it: `printf '\033Ptmux;\033\033]52;c;%s\a\033\\' "$(base64 < "$f" | tr -d '\n')" > /dev/tty`.

**Verify, and be honest.** `pbpaste | head -c 60` (macOS), `wl-paste`/`xclip -o -selection clipboard` (Linux), `powershell.exe -NoProfile -Command Get-Clipboard` (Windows/WSL). If nothing worked, say the clipboard copy failed and point at the saved file — never claim it is copied when the command errored.

## Step 6 — Confirm in ≤4 lines

State: what the loop will do, the cadence (plus the cron expression if it is an interval), the ledger path, and that the command is on the clipboard and saved at `<path>`. Tell them to paste it into a **fresh session** in the right directory. Then stop — do not run the loop here.

## Final self-check before copying

- [ ] Payload does not begin with `\d+[smhd]` and does not end with an unintended `every <time>`
- [ ] Every path is absolute; no reference to "this conversation", "the file above", "as discussed"
- [ ] Ledger file named, read first, appended last
- [ ] Stop condition present (or an explicit "runs until I cancel it")
- [ ] Guardrails cover push / merge / deploy / destructive commands
- [ ] No secrets
- [ ] Single line, 400–1200 chars, and it starts with `/loop `
- [ ] Commands in the payload are valid on the machine the loop will run on
