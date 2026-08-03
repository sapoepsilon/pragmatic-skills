Package the work from this session into **one self-contained `/loop` command**, put it on the clipboard, and stop. You are a packager, not the executor — do not start doing the looping work here.

`/loop` is a Claude Code command: `/loop [interval] <prompt>`. The command you produce will be pasted into a **fresh session that has never seen this conversation**, so it must stand entirely alone.

If text follows at the end of this prompt, treat it as the objective. Otherwise infer the objective from what this session has been working on.

**1. Harvest context** (a handful of commands, no long searches): the conversation itself; `git rev-parse --show-toplevel`, `git branch --show-current`, `git status --short`, `git log --oneline -5`; any ticket IDs, PR numbers, URLs, plan files, and the project's real build/test commands.

**2. Fill six slots** — OBJECTIVE, CADENCE, EACH RUN, STOP, GUARDRAILS, WHERE (absolute repo path, branch, target machine). Ask the user at most three questions, only for slots you genuinely cannot infer, and offer your best guess first. Never ask what you could look up.

**3. Choose the cadence.** Use a fixed interval (`5m`, `30m`, `2h`, `1d`) when the work is periodic and the gap is known; omit the interval for dynamic self-pacing when the next run depends on what the previous one observed. Intervals must divide their unit cleanly — round `7m`/`90m` to the nearest clean value and say what you rounded to.

**4. Compose the payload**, single line, 400–1200 characters, in this shape:

```
/loop <interval?> <role + objective sentence>. Repo: <ABSOLUTE PATH> (branch <branch>). Each run: 1) read <ABSOLUTE LEDGER PATH> to see what previous runs did; 2) <step>; 3) <step>; 4) append a dated one-line entry to that ledger. Guardrails: <...>. Stop when <...> — say so and stop looping.
```

Hard rules: absolute paths only, never "the file we were looking at"; always name a ledger file it reads first and appends to last, or every iteration repeats the first one; real commands exactly as this project runs them; explicit negative guardrails (default: do not push, force-push, merge, deploy, delete branches, or touch main — report and wait); no secrets, ever; commands valid on the OS where the loop will run.

Two parse traps: the prompt must not **start** with a token like `5m`/`2h` (it is eaten as the interval), and must not **end** with `every <time>` unless that is the cadence (it is stripped and used as the interval).

**5. Copy it.** Write the payload to a file first, then run the first clipboard tool that exists: `pbcopy`, `wl-copy`, `xclip -selection clipboard -in`, `xsel --clipboard --input`, `clip.exe`, `clip`, `termux-clipboard-set`, or `powershell.exe -NoProfile -Command "Set-Clipboard -Value (Get-Content -Raw '<file>')"`. Over SSH with none of those, try OSC 52: `printf '\033]52;c;%s\a' "$(base64 < <file> | tr -d '\n')" > /dev/tty`. Always also save the command to `~/.claude/loopcopy/` and print it in a fenced block. If the copy failed, say so plainly — do not claim it is on the clipboard.

**6. Confirm in at most four lines**: what the loop does, the cadence, the ledger path, and where the command is saved. Tell the user to paste it into a fresh Claude Code session in the right directory.

Before copying, verify: does not start with `\d+[smhd]`; no unintended trailing `every <time>`; all paths absolute; ledger present; stop condition present; guardrails present; no secrets; starts with `/loop `.

$ARGUMENTS
