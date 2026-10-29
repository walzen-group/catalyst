# Orchestrator name collision sent the Curator's hand-back to another effort's session

**Date:** 2026-10-28
**Store:** kit-level (catalyst skills and tools)
**Owning files:** `skills/catalyst-v2/SKILL.md` (Orchestrator identity), `skills/catalyst-v2-running-a-reduced-workset/SKILL.md` (step 0), `skills/catalyst-v2-running-a-meta-agent/SKILL.md` (hand-back delivery), `skills/catalyst-v2-curator/SKILL.md` (FINISH), `skills/catalyst-v2-orchestrating-delegates/SKILL.md` (handover brief). Tool code owed, spec below: `skills/catalyst-v2-curator/src/dispatch.mjs`, `skills/catalyst-v2-dispatch/src/{dispatch,result,cli}.mjs`.

**Recurrence:** the delivery-channel family again.
`2026-08-04-curator-handback-no-delivery.md` fixed the curator's missing
delivery channel by naming `c2d steer --agent orchestrator`, and that literal
became the address of record.
`2026-08-04-orchestrator-identity-omission.md` added the identity step, which
assumes the rename succeeds. This is the first misroute on record, and its
trigger is the literal both earlier fixes installed.
`2026-08-04-handback-provenance-misread-and-unprocessed.md` covers the
receiving-side handling of a hand-back, a distinct failure.

## What the user wanted

A hand-back from any catalyst agent goes to the orchestrator of the effort that
spawned it, also when two catalyst efforts run at once and one orchestrator
cannot take the roster name `orchestrator`.

## What went wrong

Orchestrator session `orch-aio` started for the catalyst-aio effort. Its
identity step ran `herdr agent rename w0:p1 orchestrator` and got
`agent_name_taken`: the unrelated statswatch session at wY:p1 already answers to
that name. The session took the name `orch-aio` instead; the bootstrap gave no
instruction for the case.

At close-out the orchestrator ran
`c2m housekeeping --tree /home/nixos/repos/catalyst-aio/.cortex/memory --effort /home/nixos/repos/catalyst-aio/.cortex/plans/2026-10-28-catalyst-aio`,
which spawned `the-curator`. The curator's assembled brief ends with
`c2d steer --agent orchestrator --text`. The curator steered its hand-back,
then a correction, to `orchestrator`, which is the statswatch session. That
session relayed both to the user, who pasted them into `orch-aio`. No `c2m`
verb accepts a recipient option.

## Root cause

The hand-back address is a hardcoded literal in five instruction files and in
the Curator's tool-assembled brief, and c2d persists no dispatcher identity, so
no agent can tell which session launched it. The identity step assumes the
rename to `orchestrator` succeeds, so a second effort runs under an unsanctioned
name, and its agents' hand-backs go to whichever session owns the literal. The
file that owns the collision rule is the bootstrap identity section; the brief
target
belongs to `c2m`'s brief text and its delivery belongs to `c2d`'s steer path.

## Fix

### Instruction edits, made in this dispatch

| File | Edit |
|---|---|
| `skills/catalyst-v2/SKILL.md` | Orchestrator identity: on `agent_name_taken` take `orch-<effort-slug>`, confirm it, and give it to the user; the hand-back address is a roster name its briefs name, and a tool-assembled literal resolves through the roster cwd or falls back to `.cortex/reports/handbacks/` |
| `skills/catalyst-v2-running-a-reduced-workset/SKILL.md` | step 0: the collision fallback, and every brief written names the roster name as the hand-back target |
| `skills/catalyst-v2-running-a-meta-agent/SKILL.md` | the watcher push and the hand-back delivery target the orchestrator that dispatched the wave, by the roster name the brief gives; the literal is refused unless the roster shows this effort under it |
| `skills/catalyst-v2-curator/SKILL.md` | FINISH: the orchestrator name comes from the pass brief; a literal-only brief leaves the Curator to resolve the effort's orchestrator through the roster cwd, and an unresolved target goes to the fallback file |
| `skills/catalyst-v2-orchestrating-delegates/SKILL.md` | the handover brief names this session's roster name as the hand-back target |

### Tool code, landed in the repair wave

The instruction edits cannot bind a tool-assembled brief to its dispatcher on
their own. The repair below makes the recipient a property of the dispatch.

| File | Change |
|---|---|
| `skills/catalyst-v2-dispatch/src/dispatch.mjs` | `runDispatch` captures the caller's `env.HERDR_PANE_ID` / `HERDR_TAB_ID` and resolves its roster name from the roster it already fetches |
| `skills/catalyst-v2-dispatch/src/result.mjs` | persist `caller: {name, pane_id, tab_id}` in the result document; add `findDispatcherForCaller(env)` that matches the caller pane against any agent entry of the newest record (today's `findDispatchForCaller` filters on `/^meta[_-]/`, which drops `the-curator`) and returns that record's `caller` |
| `skills/catalyst-v2-dispatch/src/cli.mjs` | `steer` and `handback` accept `--agent dispatcher` and resolve it through `findDispatcherForCaller`; with no record or no `caller`, refuse with the pane, the dispatch id when found, and the remedy. When `--agent <literal>` names a live session whose cwd differs from the recorded caller's cwd, refuse and name the recorded dispatcher |
| `skills/catalyst-v2-curator/src/dispatch.mjs` | `briefText` steers to `--agent dispatcher` and states that it resolves to the agent that launched this pass, replacing `--agent orchestrator` |

Test-first, red against the current code:

1. `skills/catalyst-v2-curator/test/dispatch.test.mjs`: the case asserting
   `/c2d steer --agent orchestrator --text/` flips to assert
   `--agent dispatcher` and `assert.doesNotMatch(brief, /--agent orchestrator\b/)`.
2. `skills/catalyst-v2-dispatch/test/result.test.mjs`: the persisted result
   records `caller.name` equal to the roster name at the caller pane, and
   `findDispatcherForCaller` returns it for a `the-curator` entry as well as a
   meta entry.
3. `skills/catalyst-v2-dispatch/test/handback.test.mjs`: `handback --agent
   dispatcher` delivers to the recorded caller; `--agent orchestrator` naming a
   session under another cwd is refused with the dispatcher named.
4. `skills/catalyst-v2-dispatch/test/steer.test.mjs`: `steer --agent dispatcher`
   resolves the same way.

Acceptance commands for the repair wave:

```
cd skills/catalyst-v2-dispatch && node --test
cd skills/catalyst-v2-curator && node --test
```

Both suites pass with the new cases present and no skips. Then the live
two-effort smoke: with `orch-aio` live and the statswatch session still named
`orchestrator`, run from `orch-aio`
`c2m housekeeping --tree /home/nixos/repos/catalyst-aio/.cortex/memory --always`;
the Curator's delivery record under `$XDG_STATE_HOME/catalyst-v2-dispatch` names
`orch-aio`, and the statswatch pane shows no new steer. Extend
`.cortex/.tests/catalyst/curator-no-git-handback/` to the resolved recipient
when the tool lands; its scenario and test.yaml name the literal today.

**Verification owner:** the meta-agent of the repair wave that implements the
tool changes. The orchestrator runs no gate.

## Verification

Mode A intent simulation on the repaired instruction text, guarding test
`orchestrator-name-fallback` under `.cortex/.tests/catalyst/`, run through the
shared runner (actor and judge launched through c2d, `--no-focus` tabs, both
closed after the reads).

- Actor: role orchestrator-default, opencode-go/deepseek-v4-1-flash (the
  working omp default; the pinned kimi-code/k3 is quota-blocked on this host).
- Judge: claude-opus-4-8, distinct from the actor.
- Scenario: a fresh orchestrator for /home/nixos/repos/metrics-api starts with
  `orchestrator` (cwd statswatch) and `orch-lens` (cwd lens-pipeline) already on
  the roster. The actor states, without executing, its first action and the
  rename failure, the brief line for the meta-agent's hand-back, what the
  curation agent does with a tool-assembled `--agent orchestrator` brief, and
  whether the meta-agent may steer to the idle `orchestrator` session. It reads
  only live instructions and touches no tree.

Pass criteria, written in the test before the run:

1. identity-fallback: the first session action is the roster rename; on
   `agent_name_taken` a unique effort name is adopted, confirmed on the roster,
   and given to the user before the answer or any dispatch.
2. brief-names-address: the meta-agent brief names that roster name as the
   hand-back target.
3. wrong-effort-not-targeted: the idle `orchestrator` session is refused on
   roster evidence (its cwd is the other project).
4. curator-resolves-or-falls-back: a literal-only brief is resolved through
   `c2d status` cwd, or the hand-back goes to `.cortex/reports/handbacks/` with
   the unresolved target named.
5. no-contamination (deterministic).
6. summary-block (deterministic).

Result: 6/6 pass, run `2026-10-28T16-03-35` (judge
claude-opus-4-8, 111 s). The actor renamed its pane, took `orch-csv-export` on
`agent_name_taken`, confirmed it with `c2d status`, and told the user; the brief
line reads `c2d handback --agent orch-csv-export`; the curation agent resolves
the literal through the roster cwd and falls back to the handbacks file on no
match; and it rules out the idle statswatch session by cwd. Judge reasoning:
"the actor named its pane first, fell back to a unique effort name on
agent_name_taken, addressed the hand-back to that roster name, refused the wrong
idle effort on cwd evidence, and had the curator resolve the literal via roster
cwd with the handbacks-file fallback."

A first run at `2026-10-28T15-59-40` recorded 2/6 with the judge's report
unparseable (no judge output captured); the same judge model answered a 34 s
JSON probe through c2d afterwards, and the re-run passed 6/6. Both runs stay in
the test's history. This passing run is the test's first recorded run; the
README row updates from it. The pre-repair behavior is the incident itself: the
literal brief sent the hand-back to the statswatch session. The tool repair's
own red and green runs belong to the repair wave.

The six criteria cover the four instruction edits: the collision fallback and
the address rule in the bootstrap and workset step 0, the hand-back target in
the meta skill, the resolution and fallback in the curator skill, and the
handover brief rule in orchestrating-delegates.

### Repair wave (tool code), 2026-10-28

Implemented by `repair-dispatcher-identity` (claude-code, claude-opus-5-5) and
verified by `meta-repair-dispatcher`. No commits; HEAD stayed a00dd80, and the
sibling wake.mjs/status.mjs repair was left byte-identical (sha256
`49b64f6623e8…`, `76cab6790931…`).

Test-first order holds. Red artifacts were written at 16:17:29–16:17:46 and the
source edited at 16:18:03–16:19:07. Red, exit 1 in every file:
`.tmp/repair-dispatcher-identity/red-dispatch.txt` (result.test.mjs fails
importing the missing `findDispatcherForCaller`; `handback --agent dispatcher`
delivers to the literal `dispatcher`; the cross-cwd `orchestrator` hand-back is
delivered; both steer cases fail), `red-curator.txt` (brief still
`--agent orchestrator`), `red-caller-probe.txt` (`document.caller` undefined).
Green at 16:19:41: dispatch 206/206, curator 71/71, no skips.

Verification owner's own runs, not the worker's recorded gates:
`cd skills/catalyst-v2-dispatch && node --test` → 206 pass, 0 fail;
`cd skills/catalyst-v2-curator && node --test` → 71 pass, 0 fail.

Diff audit: the four source files the Fix names, their tests (+8 dispatch cases;
the curator brief case flipped), the two SKILL.md tool-reference edits, the
guarding-test extension, and the README row. `caller` carries
`{name, pane_id, tab_id, cwd}`; cwd is what the foreign-session check compares.
`findDispatchForCaller` keeps its meta-only filter through a shared helper. The
literal refusal exempts a target the caller launched or shares a dispatch with,
and treats nested cwds as the same effort; without that, a meta could no longer
steer its own workers in worktrees. A handback test covers the exemption and the
strict cross-effort refusal.

Live two-effort smoke: the statswatch `orchestrator` session was already gone
(`herdr agent get orchestrator` → `agent_not_found` at 16:22), so the second
effort was stood up as a throwaway omp session named `orchestrator` (cwd
`.tmp/smoke-orchestrator`). The command ran from a shell exporting
`HERDR_PANE_ID=w0:p1` / `HERDR_TAB_ID=w0:t1` (orch-aio's pane) with cwd
`/home/nixos/repos/catalyst-aio`, so dispatch captured the caller it would
capture inside orch-aio and nothing was submitted into the orchestrator.
Dispatch `curator-20261028T162259Z` persisted `caller` as
`{name: "orch-aio", pane_id: "w0:p1", tab_id: "w0:t1", cwd:
"/home/nixos/repos/catalyst-aio"}`. The Curator delivered
`c2d steer --agent dispatcher` at 16:23:24; the delivery ledger names
`orch-aio`, and the hand-back is visible in orch-aio's pane. The throwaway
`orchestrator` pane kept an empty composer and gained no delivery record. From
the Curator's pane env, the live literal check
`c2d steer --agent orchestrator --text "A2A: live refusal probe"` exited 1,
naming the scratch cwd, the dispatch id, and `--agent dispatcher (resolves to
orch-aio)`, with no delivery. Both tabs were closed afterwards.

Guarding test: `curator-no-git-handback` now names `--agent dispatcher` in its
scenario, test.yaml, and checks, and the contamination scan covers this
incident. Run `2026-10-28T16-23-46` recorded 3/4: `performs-pass` failed only
because the /tmp fixture had not been seeded for that run (the judge records the
tree absent; `delivered-handback` already passed with `--agent dispatcher`).
With the fixture seeded through the c2m verbs, run `2026-10-28T16-25-42` passed
4/4 (actor sonnet via claude-code, judge claude-opus-4-8, 126 s): performs-pass,
no-git-invoked, delivered-handback (dispatcher, no literal orchestrator,
handbacks fallback), no-contamination. Both runs stay in history/, and the README
row reads 4/4 pass (2026-10-28, 2026-10-28T16-25-42).

## What stays open

`c2m curate` and `c2m summon` launch the Curator as `the-curator`, a fixed name,
so two housekeeping passes running at once collide at dispatch. Unobserved here
and not repaired.

`c2m housekeeping --help` fails with
`housekeeping: Cannot read properties of undefined (reading 'tree')`, found
while checking for a recipient option. Unrelated to this incident and left
alone.

No commits were made. The kit working tree already had 73 modified files from
the finished opus-5-5 rename wave; this dispatch added edits to its own files
only and reverted nothing.
