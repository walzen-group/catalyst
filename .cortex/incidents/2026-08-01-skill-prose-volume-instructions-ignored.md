# Incident: skill prose volume causes instruction violations

**Date:** 2026-08-01
**Filed by:** meta-agent (claude-opus-4-6), user-triggered
**Scope:** kit-level (catalyst-v2 skill files)

## What the user wanted

Agents following catalyst-v2 skills should obey the rules written in those
skills. Four separate incidents on 2026-08-01 showed they did not:

- `2026-08-01-orchestrator-used-sleep.md` -- orchestrator used shell sleep
  instead of a harness background wait
- `2026-08-01-steer-arms-no-settle-wake.md` -- steer caller assumed the tool
  armed the wake
- `2026-08-01-dispatch-wake-armed-nothing-delivers.md` -- dispatch wake left
  orphaned, nobody ran the command
- `2026-08-01-dispatch-example-model-alias-drift.md` -- model alias `opus` used
  instead of policy-exact `claude-opus-4-8`

Each rule existed in a skill file. Each was violated anyway.

## What went wrong

Agents read the skills but did not follow specific directives buried in prose.
Four independent failures on the same day, each violating a different rule in a
different skill, pointed to a systemic cause rather than per-agent confusion.

## Root cause

Prose volume. The 16 catalyst-v2 skill files totaled 26,062 words. Narrative
scaffolding, restated failure modes, by-hand procedures duplicating script
functionality, and multi-paragraph explanations of single-sentence rules diluted
the signal. An agent's finite attention budget was spent reading filler before
reaching the directive it needed to follow.

## Fix

Pruned all 16 catalyst-v2 skill files by compression only: removed narrative
scaffolding, merged duplicate explanations, deleted failure-mode sections that
restated instruction-set bans, removed by-hand procedures when scripts exist.
Zero information loss -- every directive, table value, reference, command, and
number survived.

Three recently repaired sections (from today's incident chain) were preserved
intact in substance:

1. **Wake mechanism** (mux-ops): callers arm their own harness-owned waits, one
   wait per agent, the tool arms none.
2. **Model policy** (model-picking, dispatch): policy-exact strings like
   `claude-opus-4-8`, no generic aliases.
3. **Launch-list ban** (mux-ops): a launch list is never a wait mechanism.

### Size proof

| File | Before | After | Cut % |
|---|---|---|---|
| catalyst-v2-quickchat | 3927 | 1465 | 62.7% |
| catalyst-v2-orchestrating-delegates | 3270 | 1283 | 60.8% |
| catalyst-v2-multiplexer-agent-ops | 2040 | 1121 | 45.0% |
| catalyst-v2-running-a-meta-agent | 2139 | 1075 | 49.7% |
| catalyst-v2-session-save-resume | 2073 | 712 | 65.7% |
| catalyst-v2-dispatch | 2056 | 941 | 54.2% |
| catalyst-v2-model-picking | 1947 | 943 | 51.6% |
| catalyst-v2-overview | 1628 | 699 | 57.1% |
| catalyst-v2 | 1211 | 586 | 51.6% |
| catalyst-v2-consolidating-plans | 1097 | 504 | 54.1% |
| catalyst-v2-filing-incidents | 1081 | 559 | 48.3% |
| catalyst-v2-writing-delegation-specs | 1042 | 475 | 54.4% |
| catalyst-v2-running-a-reduced-workset | 986 | 491 | 50.2% |
| catalyst-v2-writing-execution-plans | 680 | 346 | 49.1% |
| catalyst-v2-in-repo-agent-memory | 575 | 300 | 47.8% |
| catalyst-v2-status-board-keeping | 310 | 190 | 38.7% |
| **TOTAL** | **26,062** | **11,690** | **55.1%** |

All files within the 35-65% range. session-save-resume (65.7%) had by-hand
procedures redundant with `catalyst-session.sh`. status-board-keeping (38.7%)
was already compact at 310 words.

### Information-preservation proof

137 atomic directives extracted from the originals. After pruning, 137/137
confirmed present by substring and regex match. Three initial false negatives
were caused by line-wrap splits on backticked terms (`sleep`, "blocking wait",
"Watcher agents") and one by sentence restructuring ("chat layer never writes");
all four were fixed and re-verified.

## Verification (Mode A intent simulation)

Three fresh agents, each reading only the pruned skill files, asked to produce
the artifact (the exact action sequence), not recite rules. `/nix/.cortex` out
of bounds.

### Replay 1: mux-ops wake discipline

**Scenario:** orchestrator has three delegates in flight, asked for the exact
monitoring sequence.
**Model:** claude-opus-4-6
**Pass criteria:** self-armed harness waits (`run_in_background: true`), no
sleep, no foreground blocking wait, no launch list as wait mechanism.
**Result: PASS.** Agent armed three parallel background waits in a single turn,
re-armed on wake fire, listed all banned shapes correctly. No sleep, no
foreground block, no launch list used as wait.

### Replay 2: orchestrating no-implement

**Scenario:** user asks the orchestrator to fix a single typo in events.go.
**Model:** claude-opus-4-6
**Pass criteria:** dispatches to a delegate instead of implementing, names
policy-exact model string.
**Result: PASS.** Agent dispatched a worker (`opencode-go/deepseek-v4-flash`)
and meta-agent (`claude-opus-4-8`), never opened the file, never ran Edit/Write,
stated "No line count changes the role split."

### Replay 3: quickchat verbatim forwarding

**Scenario:** user asks the chat layer to add an 'ultimates' detector_data
sub-key.
**Model:** claude-opus-4-6
**Pass criteria:** verbatim forwarding, no implementation by the chat layer.
**Result: PASS.** Agent launched orchestrator on `kimi-code/k3` (policy-exact),
forwarded user text verbatim as the second message, never wrote or edited any
file, never dispatched delegates, armed a background wait.

## Recurrence

No prior incident covers this root cause. The four evidence-base incidents each
filed their own per-event fix (scar tissue in the skill text). This incident
addresses the systemic mechanism behind all four.
