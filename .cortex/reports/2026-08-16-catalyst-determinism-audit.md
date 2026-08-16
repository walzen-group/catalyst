# Catalyst determinism audit: T1/T2/T3 instruction quality

Auditor: impl-t4-audit (frontier, read-only). Date: 2026-08-16. Cold read; I
wrote none of these changes.

## Verdict first

Instruction quality held. No rule fell through the gap: every rule T2 shortened
is now enforced by a named c2d check that runs green, or still stated in prose.
The meta-agent rewrite, the SDD broadening, and the escalate-don't-skip
principle all pass. Both kit-memory notes are present.

One defect to route, low severity: a house-style violation (negative framing) in
the meta-agent step 1 tail. Two minor notes below it. None blocks; all are prose
polish, not lost rules.

## What I audited

T1 (c2d code, staged): cli.mjs, handback.mjs, preflight.mjs, schema.mjs, plus
tests. T2 (prose): running-a-meta-agent, orchestrating-delegates,
planning-artifacts, filing-incidents. T3 (prose + memory): catalyst-v2 bootstrap,
sdd-rules, two c2m notes.

Out of audit scope (present in the checkout, not part of this plan): the
multiplexer-agent-ops SKILL edit, omp/agent/config.yml, .cortex/.tests README,
the two incident files, and the nix-cli-gotcha memory note. Those belong to the
omp-gauge-cache-rate effort, not T1/T2/T3. I did not audit them.

## Removed or shortened rule to current enforcer

| Rule the prose carried | Where it shortened | Current enforcer | Held? |
|---|---|---|---|
| A repair dispatch must carry its incident in the same dispatch | orchestrating-delegates, planning-artifacts, filing-incidents | c2d preflight: `kind === 'repair'` requires `incident_path`, checked by `isIncidentPath` (must sit under .cortex/incidents/) plus `statOrNull().isFile()` existence (preflight.mjs). `incident_path` added to AGENT_KEYS and `repair` to AGENT_KINDS (schema.mjs) | Yes |
| A repair still needs a meta present | orchestrating-delegates | preflight meta gate: `repair` is not in the exempt set, so the worker-needs-meta gate applies | Yes |
| Who files the incident (repair meta files it, or a filing meta is dispatched alongside) | orchestrating-delegates (dropped) | Not tool-enforced; the enforced invariant is that the incident exists at dispatch. The "who" was guidance on satisfying it, not a separate rule | Yes, subsumed |
| Hand-back must be complete (files changed, per-worker diffs, gate output, whole-change output, deliverable paths) | running-a-meta-agent step 3 | c2d handback verb + validateHandback: each of files_changed, diffs_per_worker, gate_evidence, whole_change_output refused by name when missing or empty; deliverable_paths required, empty list valid (handback.mjs) | Yes |
| Gate evidence is the worker's recorded run, cited not re-run | running-a-meta-agent steps 1, 3 | validateHandback: gate_evidence must statSync to an existing artifact, else refused by name (handback.mjs). Reinforced by prose step 2 "Do not re-run each worker's own gates" | Yes |
| Hand-back delivery never uses raw send-keys; steer/handback path only | running-a-meta-agent step 3 | Prose retained; handback delivers through steerAgent, which keeps the composer-hold, A2A attribution, and consumption checks (cli.mjs runHandback) | Yes |
| Motivation: handing edits back separately leaves contradicting text live | filing-incidents (dropped) | Not re-stated in filing-incidents; the why survives in orchestrating-delegates ("the failure recurring") and incident 2026-08-05-repair-dispatched-without-incident.md | Partial, see charge 2 |

All 163 c2d tests pass (`node --test`), so both new enforcers are live, not just
written. handback.test.mjs and repair-incident.test.mjs are present.

## Three carried charges

### Charge 1: does the escalate-don't-skip principle still carry anti-skip force?

Pass. The positive-only rewrite holds the force. Two clauses do the work:
"escalation is the only exit" makes escalation the sole way past the gate, and
"an unconfirmed one is a hold" stops the agent where an unapproved skip would
have let it proceed. "The only exit" is a stronger constraint than the dropped
"not a license to skip it", because it names what the agent must do rather than
what it must not. The principle does not read as optional.

Placement is correct: it sits in the bootstrap Core principles next to the
ambiguity principle, as T3 specified. It aligns with "the user's word is ground
truth" and the REQUIRED-skills gate; no contradiction.

### Charge 2: does filing-incidents still explain why the one-dispatch rule exists?

Weak pass, with a note. The dropped sentence was the local motivation. After the
trim, filing-incidents states the rule ("An incident and its repair are ONE
dispatch") and its enforcer ("c2d preflight refuses a repair dispatch that names
no existing incident") but no longer says why coupling matters. A reader who
stops at filing-incidents gets the what and the enforcement, not the reason.

The why is still reachable: orchestrating-delegates keeps "A repair dispatched
alone, the incident filed later on a user prompt, is the failure recurring" and
cites incident 2026-08-05-repair-dispatched-without-incident.md. So the
motivation survives at the system level, one file over. I would not block on
this. If the orchestrator wants the rule to stand on its own in
filing-incidents, a five-word clause pointing at that incident would restore the
reason without reflating the prose. Optional.

### Charge 3: meta-agent step 1 framing, "the gate is not re-run"

This is the one defect. Step 1 reads: "The record is the confirmation; the gate
is not re-run (step 2)." The first clause is the positive statement and it is
good. The tail "the gate is not re-run" is negative framing, which
catalyst-v2-writing-docs rule 6 rules out (describe what a thing does).

The rule does allow a contrast at a known failure mode, and re-running the gate
is exactly the thread-A failure this rewrite targets, so the clause is not
gratuitous. But it duplicates step 2, which already says "Do not re-run each
worker's own gates." My call: drop the tail and let step 1 end on "The record is
the confirmation", relying on the step 2 cross-reference, or restate as a plain
pointer ("confirmation is the record; step 2 owns the no-re-run rule"). Low
severity, prose only. The no-re-run rule itself is safe: it lives in step 2
unchanged.

## Pass/fail on the three targets

Meta-agent rewrite: pass. Step 1 now reads as read-the-recorded-evidence (the
transcript, the gate output, the diff showing the test ran), not re-execute. The
no-re-run rule survives in step 2. The whole-change check is untouched: step 2
still runs the end-to-end check in pinned toolchains and reads the diff against
each task's spec. Step 3 names the real T1 surface (`c2d handback --agent
<orchestrator> --file <path>`) and lists the exact schema fields. One style
defect (charge 3).

SDD broadening: pass. Description goes from "Use when fixing a behavior or bug"
to "Use when implementing any change to observable behavior with a checkable
outcome". Strictly wider; bug fixes are a subset. No existing case dropped: the
fix-spec and red-run-check clauses stay. The bootstrap routing row widens the
same way. The added sdd-rules line ("A fix with no clean red run escalates ...
per the escalate-don't-skip principle") points at the new bootstrap principle
correctly.

Escalate-don't-skip principle: pass. See charge 1.

## Humanizer verdict per changed prose file

| File | Verdict | Notes |
|---|---|---|
| catalyst-v2/SKILL.md | Pass | New principle is clean: no em dash, no "X, not Y", no banned word, no new "The" heading |
| catalyst-v2-sdd-rules/SKILL.md | Pass | Added line and widened description are positive framing, no banned patterns |
| catalyst-v2-running-a-meta-agent/SKILL.md | One violation | Line 119: "the gate is not re-run" is negative framing (rule 6). Charge 3. Pre-existing negatives ("last resort, never the primary channel"; "a hold, not a failure to work around") were not introduced by T2 |
| catalyst-v2-orchestrating-delegates/SKILL.md | Pass | Reworded to a positive pointer at the repair kind and preflight; no new banned pattern |
| catalyst-v2-planning-artifacts/SKILL.md | Pass | Shortened to a positive statement naming incident_path and preflight |
| catalyst-v2-filing-incidents/SKILL.md | Pass | Positive pointer at the c2d check; see charge 2 for the dropped motivation (a content note, not a humanizer flag) |

## Prose-shrink check (determinism subtracts prose)

Net word count across the four T2 files went down, thinly: 6731 to 6725, a
6-word drop. The three shrink targets fell (orchestrating-delegates -19,
planning-artifacts -28, filing-incidents -5); the meta-agent file rose +46 for
the thread-A hand-back rewrite, which is the deliberate additive part of T2, not
a shrink target. The governing principle holds net. I note it is thin so the
orchestrator sees the meta-agent growth was expected, not drift.

## Overall

Instruction quality held across T1, T2, and T3. No rule was lost; the two rules
T2 moved into the tool are enforced by named c2d checks that pass, and the prose
that shrank still tells a reader the rule exists and where the tool enforces it.

Defects to route (none blocking):

1. meta-agent SKILL.md line 119, "the gate is not re-run": house-style negative
   framing. Fix: drop the tail or restate as a step 2 pointer. Low severity.
2. filing-incidents motivation is bare in that file alone (charge 2). Optional:
   a short pointer at incident 2026-08-05. The why still exists one file over.

A found defect is reported, not fixed. The orchestrator routes both.
