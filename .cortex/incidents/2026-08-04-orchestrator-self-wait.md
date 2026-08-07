# Orchestrator armed settle waits on its own pane

**Status:** filed; fix landed in this dispatch (tool code + skill text), verified.
**Filed:** 2026-08-04
**Store:** kit-level (catalyst skills + dispatch tool).
**Owning files:** `settings/skills/catalyst-v2-dispatch/src/status.mjs`
(wake-gap and classification reads), `catalyst-v2-multiplexer-agent-ops/SKILL.md`
(wake discipline), `catalyst-v2-orchestrating-delegates/SKILL.md` (detection
table).

## Answer first

During the prior incident cycle, `c2d status` reported a wake gap for the
`orchestrator` roster name, the caller's own pane, and prescribed
`herdr agent wait orchestrator --timeout 900000`. The orchestrator ran that
command repeatedly. Each self-wait settled immediately (the target was its own
live pane), woke nobody, and produced noisy background jobs and misleading
monitoring updates. The tool had no notion of caller identity: it computed
wake gaps over every roster entry including the one the caller itself was
running in. The tool now marks the caller's own entry `caller_self: true`,
prescribes no wait on it, and never reports it as a gap; the skills state the
rule explicitly.

## What the user wanted

The orchestrator arms and re-arms waits only for the agents it monitors
(especially the meta-agent), never for its own named pane. The correct
response to a self-pane wake gap is to exclude the orchestrator from the
monitored-agent set, recognize the orchestrator role as the caller, and
monitor the meta-agent's prescribed wait.

## What went wrong

1. The orchestrator (roster name `orchestrator`, its own herdr pane) ran
   `c2d status` with no dispatch-id, so the read targeted every roster agent,
   itself included.
2. `wakeMissing` fired on its own entry: the caller's pane reads `working`
   (it is the one running the tool) and no `herdr agent wait orchestrator`
   process exists, because nobody can meaningfully wait on the caller's own
   pane.
3. `classify` returned `UNWATCHED` with reason "a meta is at work, but no
   live wait is running for orchestrator: a settle would go unnoticed", and
   the entry's wake note said "Run the command above as a background job of
   your own harness".
4. The orchestrator followed the prescription: it ran
   `herdr agent wait orchestrator --timeout 900000` as a harness background
   job, repeatedly, across the incident cycle. The wait settled immediately
   against its own live pane, so each one was a completed no-op job that
   delivered nothing and read as monitoring activity.

## Root cause

`status.mjs` computes wake gaps over the whole roster with no caller
identity: an entry that is `working` with no live wait is a gap, and the
caller's own entry is exactly that by construction. `prescribeWake`'s
per-agent unit ("a wake is owed when the agent is genuinely uncovered") was
correct for dispatched targets but has no caller exclusion; the status read
then instructed the caller to arm the impossible self-wait. No instruction
text told the orchestrator that its own roster name is not a monitored
agent, so the tool's prescription was followed as written.

Recurrence scan: no prior incident records a self-wait; the closest are
`2026-08-01-dispatch-wake-armed-nothing-delivers.md` (wake delivery) and
`2026-08-02-status-misclassified-worker-as-meta.md` (role heuristics in the
same tool). Both fixed different defects in the same wake machinery.

## Fix

Made in this dispatch, in `settings/skills/` (bind-mounted read/write at
`~/nix/settings/skills`).

**Tool code, `catalyst-v2-dispatch/src/status.mjs`:**

- `readStatus` detects the caller's own roster entry via the herdr pane ids
  herdr sets in every agent pane (`HERDR_TAB_ID` / `HERDR_PANE_ID`) matched
  against the roster entries' `tab_id` / `pane_id`. Outside herdr (plain
  shell) no ids exist and no self-exclusion applies.
- The caller's own entry is marked `caller_self: true` and its wake block is
  overridden: `prescribed: false`, `command: null`, and a note stating the
  pane is the caller, not a monitored agent, and that no wait is owed on its
  own name. A stale wake record on disk for the caller's name is ignored.
- `wakeMissing` returns false for a `caller_self` entry, so the caller's name
  never lands in `wake_gaps` or in an `UNWATCHED` reason.
- `classify` drops `caller_self` entries from the in-flight worker set: the
  caller is not a dispatched worker and never needs a meta.

**Instruction text, `catalyst-v2-multiplexer-agent-ops/SKILL.md`:** the wake
discipline gains "Never arm a wait on your own name": the own roster entry is
the caller, `status` marks it `caller_self` and counts no gap for it; a
self-wait settles immediately and wakes nobody; a self-pane wake gap means
exclude yourself from the monitored set and re-arm the waits that matter.

**Instruction text, `catalyst-v2-orchestrating-delegates/SKILL.md`:** the
UNWATCHED response cell notes that a wake gap naming your own name is not one
(the caller owes no wait on itself).

## Verification

**Unit suite** (`catalyst-v2-dispatch`): 129 pass, 0 fail (`node --test
test/*.test.mjs`; 124 before this repair). New `test/status.test.mjs` cases
pin each defect: `classify` never names the caller's own entry as a wake gap
and never counts it as an in-flight worker; `readStatus` (driven through the
fake-herdr test seam, new `agent list` verb) marks the caller's own entry
`caller_self: true` with `prescribed: false`, `command: null`, and no self
entry in `wake_gaps`; without herdr pane ids no entry is read as the caller.
Live read from the caller's own pane confirms the shape: own entry
`caller_self: true`, wake command null, no wake gap.

**Mode A guard replay** (durable test `no-self-wait` under
`~/nix/.cortex/.tests/catalyst/`): 3/3 pass, run 2026-08-04T21-17-15, actor
opencode-go/deepseek-v4-flash, judge claude-opus-4-8. A fresh orchestrator,
reading only the live repaired instructions, was handed the exact failing
input (its own roster name flagged as a wake gap beside a working meta and
worker) and decided: "orchestrator — arm nothing; do NOT run
herdr agent wait orchestrator ... my own roster entry is the caller/watcher,
not a monitored agent ... its flagged gap is not one and receives no wait",
while keeping the meta-agent's live wait armed. No contamination (the actor
cited none of this dispatch's materials). Pass criteria were written before
the run, in `test.yaml`.

## What stays open

- A steer that targets the caller's own name (`c2d steer --agent <self>`) still
  prescribes a wake for it; the caller could arm it. The self-wait ban in the
  skill covers this, and no evidence of that shape exists yet.
- Stale wake records for the caller's own name may remain on disk; status now
  ignores them for the caller's own entry.

## Related

- `2026-08-01-dispatch-wake-armed-nothing-delivers.md`: the wake has no
  delivery path unless the caller's own harness runs it; the caller-arms-every-
  wake rule this incident extends.
- `2026-08-02-status-misclassified-worker-as-meta.md`: role heuristics in the
  same tool reading workers as metas; fixed by name-prefix-only `roleFor`.
