# Dispatch armed a wake that could deliver to nobody

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Severity:** major, declared by the user
**Owning files:** `catalyst-v2-dispatch/src/wake.mjs` (with `result.mjs`,
`status.mjs`, `launch.mjs`, `steer.mjs`), and
`catalyst-v2-multiplexer-agent-ops/SKILL.md`, which told callers to trust it.

**Recurrence: yes.** `2026-08-01-steer-arms-no-settle-wake.md`, filed five hours
earlier, is the same wake guarantee failing one layer down. That repair made
`steer` call `armWake` and proved the result document said `wake.armed: true`
with a record on disk. It verified that a wake was *armed* and never that one
*wakes anybody*. The arming was always the cheap half. So the earlier fix is
itself the root cause repaired here.

Note also that both that report and the multiplexer skill cite
`.cortex/incidents/2026-07-31-orchestrator-stalled-on-settled-delegates.md` as
the founding precedent. That file exists in neither store and nowhere on this
filesystem. The lesson survived only as a citation.

## What the user wanted

An armed wake fires when its agent settles and resumes the waiting session, so
the orchestrator reads the settled worker and relays promptly. A settled worker
never goes unnoticed.

## What went wrong

The orchestrator (`w3:t9`, omp, kimi-code/k3) relayed a user directive to
`meta-sleep-incident` (`w3:t6`, omp, opencode-go/deepseek-v4-flash) with
`catalyst-v2-dispatch steer`. The call reported a settle wake armed: pid 178929,
timeout 900000 ms, `status_at_return: working`. The orchestrator ended its turn
on that.

From its session transcript (`2026-08-01T18-15-22`), the wake ledger, and the
process table:

| Time | Event |
|---|---|
| 18:21:07 | steer returns; wake record written for pid 178929, 900000 ms (expiry 18:36:07) |
| 18:23:05 | **user intervenes**: "i can't see a wait scheduled on the orchestrator" |
| 18:23:18 | orchestrator's own `ps`: pid 178929 alive, elapsed 02:10 |
| 18:24:56 | `meta-sleep-incident` settles to `idle` (last transcript write) |
| 18:23:43 → 18:25:41 | orchestrator does nothing at all. No delivery arrived |
| 18:25:41 | **user intervenes again**, angrily, demanding a harness-visible wait |
| 18:26:00 | orchestrator's `ps`: "wake 178929 is dead" |

The wait process died between 18:23:18 (alive) and 18:26:00 (dead), a window
bracketing the 18:24:56 settle, and ten minutes before its own timeout. It
detected the settle correctly and exited on it. Nothing was delivered. The
orchestrator sat idle through it and noticed only because the user told it twice.

The orchestrator then reported that the wait "fired instantly because the agent
had already settled". That describes a different process: `bg_1`, a fresh wait it
started at 18:26:13, by which time the target genuinely had settled. Pid 178929
was a separate wait that had died on the real transition minutes earlier and woke
no one. The user disputed the explanation and the user was right.

The contrast that indicts the tool sits in the same transcript. The identical
command, run as a harness-tracked background job, delivered:

- 18:26:13 `bg_1` backgrounded, and in the same second a
  `<system-notice> Background job bg_1 has completed` carried the wait result in.
- 18:27:32 `bg_2` backgrounded; 18:28:05 its system notice landed, delivering
  quickchat's settle.

Same binary, same arguments, opposite outcomes. The process table shows why: a
tool-spawned wait runs with **ppid 1**, while the harness-run wait's parent is the
harness's own shell.

## Root cause

**The tool's wake had no delivery path, and never had one.** `armWake` spawned
`herdr agent wait` with `detached: true`, `stdio: 'ignore'`, and `child.unref()`,
then returned. No `exit` or `close` handler was registered anywhere in the tool.
The CLI then exited, the wait was reparented to init, and its eventual exit was
observed by nothing: not the tool, which was gone, and not the caller's harness,
which injects a resume notice only for background jobs *it* owns. The sole reader
of a wake was `status`, which polls the record and tests the pid with `kill(pid,
0)` — a pull, and only for a caller already awake enough to run it.

So detection worked and delivery did not exist. `wake.armed: true` with a live pid
was a false green, and an actively harmful one: it read as "you will be woken",
which is precisely why the orchestrator ended its turn.

This is structural rather than a missing line of code. The tool runs as a child of
the shell the caller's harness spawned for one tool call. It cannot register a
background job inside the caller's harness, so it can never arm a wake that
resumes its caller. The only mechanism that resumes an ended turn in this
environment is a background job the caller's own harness owns.

**Second defect, same module.** The file's header claimed a herdr wait "matches
status TRANSITIONS observed after the call, not current state", so `armWake`
skipped arming against any already-settled target. Measured live during this
repair: `herdr agent wait` on a settled agent returns at once, exit 0, with the
agent document, in about 5 ms. The premise was false, and the skip it justified
left callers with no wait at all in exactly the case where a delegate had finished
early.

## Fix

Made in this dispatch, in `settings/skills/` (bind-mounted at `/opt/skills`).

**The tool stops pretending.** `wake.mjs` no longer spawns anything. `armWake` is
replaced by `prescribeWake`, which records the obligation and returns the exact
command the caller must run, with `owed_by: "caller"`, `armed_by_tool: false`, and
an instruction naming the agent as UNWATCHED until the caller runs it. There is no
`armed` field and no `pid` to mistake for a guarantee. The false-premise skip is
gone: a wake is prescribed whatever the status at return.

**Coverage is per agent, not per call.** On the user's objection mid-repair, and
correctly: `herdr agent wait` settles on the *agent*, so one live wait already
covers whatever that agent is doing however many times it has been steered. A wait
armed per steer would fire N times on one settle. `prescribeWake` now checks for an
existing live wait first and returns `already_running: true` with that pid and an
instruction to arm nothing further. A wake is owed only when the agent is genuinely
uncovered.

**`status` reads reality instead of the ledger.** New `liveWaitFor(name)` scans the
process table for a real `herdr agent wait <name>`, so it sees the wait the caller
ran, whoever started it. It requires argv[0] to actually be `herdr` (a shell
wrapper or a `grep` carrying the phrase is not a wait) and matches the agent name
as its own argument. A wait whose parent is init is reported `orphaned: true` and
counts as no coverage, so the exact failure above now reads as a wake gap rather
than as health. `result.mjs` reports the new shape and counts `wakes_prescribed`,
stating plainly that whether the caller ran them is unknown to the tool.

**The instruction text that produced the behaviour.**
`catalyst-v2-multiplexer-agent-ops/SKILL.md` said "The tool arms one settle-wake
per agent at dispatch" and listed "wakes armed through `catalyst-v2-dispatch`" as
a wait mechanism coequal with a backgrounded `herdr agent wait`. The orchestrator
followed that text exactly. It now says the caller arms every wake itself, that
the tool arms none, that a wait not owned by your harness is orphaned and reaches
nobody, that a real wake is provable as a harness-tracked background job, and that
the unit is one wait per agent rather than one per message. The same claim was
corrected in `catalyst-v2-dispatch/SKILL.md` (new section, "The tool does not wake
you"), `catalyst-v2-overview`, `catalyst-v2-orchestrating-delegates`,
`catalyst-v2-running-a-reduced-workset`, and `catalyst-v2-running-a-meta-agent`.

## Verification

**Unit: 61 pass, 0 fail** (`node --test test/*.test.mjs`; 51 before this repair).
New `test/wake.test.mjs` pins each defect: `prescribeWake` starts no process and
reports no pid, measured by counting `herdr agent wait` processes across the call;
a settled target still gets a prescription rather than a skip; an orphaned
(ppid 1) wait is not counted as coverage while a harness-owned one is; a shell
wrapper or grep merely mentioning the command is not counted; a second call
against an already-covered agent returns `already_running` and asks for no
duplicate. `steer.test.mjs` now asserts the tool never claims `armed` and never
reports a spawned pid.

**Live end-to-end, pass criteria fixed before the run:** a wake armed by the
caller while its target is confirmed `working` must block, fire on the target's
settle, and resume the caller's session.

- Scratch agent `wake-proof` steered onto a long task; `herdr agent get` confirmed
  `working` immediately before arming.
- The handed-back command was run as a harness background job at **18:45:18**.
- It blocked **24 seconds** and fired at **18:45:42** with the agent at `done`,
  and the harness delivered a completion notice that resumed the session.

That is the delivery the orchestrator never got. A second run against a target
that had already settled returned immediately with the agent document, confirming
the measured behaviour that retired the skip.

`catalyst-v2-dispatch status --agents wake-proof` read the caller's live wait
correctly while it ran: `running: true, pid 215429, ppid 215427, orphaned: false`,
with the note that its owner will be woken. Before the argv tightening the same
read matched the harness's shell wrapper, which is a false green of the same
family; it now matches the herdr process itself.

No replay agent was used. This repair is tool code, verified by its suite and a
live proof, so Mode A intent simulation is not the mode this fix owes.

## What stays open

- **A deduplicated steer returns no wake guidance.** When `deliver` reports
  `skipped` (identical text already sent to that session), `steerAgent` returns
  before reading the agent's status and before prescribing, so `wake` comes back
  null while the agent may well be working. Same class as this incident, smaller
  reach. Closing it needs an extra status read on that path, deliberately left out
  of scope here.
- **The founding incident is missing.** The precedent both this chain and the
  multiplexer skill cite,
  `2026-07-31-orchestrator-stalled-on-settled-delegates.md`, is not on disk. The
  citation in the skill has been repointed at this report.
- The tool cannot confirm the caller actually armed what it handed back. `status`
  detects it after the fact, which is the honest limit of a subprocess.
