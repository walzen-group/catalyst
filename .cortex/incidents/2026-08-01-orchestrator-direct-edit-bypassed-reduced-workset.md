# orchestrator edited a skill file directly, skipping the reduced workset

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2/SKILL.md` (the always-loaded bootstrap). The
"orchestrator does not implement" boundary already lived in
`catalyst-v2-running-a-reduced-workset` and `catalyst-v2-orchestrating-delegates`,
but only behind a routing hop; the bootstrap that every orchestration action
consults carried no stop of its own.

**Recurrence:** none. First filing for the direct-edit shape. Related in class to
the design-time principle "delegates write code, the orchestrator does not," but
the prior incidents cover wait mechanics and delivery, not an orchestrator
implementing a repo change itself.

## What the user wanted

The orchestrator to add an "Orchestrator identity" section to
`settings/skills/catalyst-v2/SKILL.md` (telling orchestrators to name themselves
in herdr before dispatching), carried out through the catalyst workset: route the
tier, dispatch a delegate through `catalyst-v2-dispatch`, hand over to a
meta-agent for verification.

## What went wrong

The orchestrator edited `settings/skills/catalyst-v2/SKILL.md` itself with the
Edit tool. No delegate was dispatched, no meta-agent verified the change, and the
reduced workset was skipped end to end. The user caught it and called it out.

The change was small (one section) and touched a skill file rather than
production code, which is exactly the shape that reads as "too small to dispatch"
or "not really a product file." Neither reading is an exception, but nothing at
the surface the orchestrator was working from said so.

## Root cause

The rule the orchestrator broke is stated correctly in two skills:

- `catalyst-v2-running-a-reduced-workset`: "Reduced means less process, never
  that the orchestrator implements. [...] if the next Edit/Write would touch a
  product file, stop and dispatch."
- `catalyst-v2-orchestrating-delegates`: "if the next Edit/Write would touch a
  product file, stop and dispatch. The orchestrator's Edit/Write is for
  `.cortex/` artifacts only."

Both are reached only after the orchestrator classifies the task as one that
needs a workset and routes to the sub-skill. The failure is upstream of that: a
one-paragraph skill edit does not trip the "this is orchestration, go read the
matching skill" recognition, so the orchestrator acted from the bootstrap (and
memory of it) and never opened either sub-skill. The bootstrap
(`catalyst-v2/SKILL.md`), the one file every orchestration action is supposed to
consult, only routes to the boundary; it states no stop itself. An orchestrator
loading it sees a routing table and a two-worksets summary ("delegates write
code"), neither of which fires before a direct Edit.

Second contributing gap: the boundary in both sub-skills is phrased around a
"product file." A skill or markdown doc is easy to read out of that category
("this is just docs, not a product file"), and the exact task here was a skill
file.

## Fix

Two surgical edits, made in this dispatch. Both files are the live instruction
(`settings/skills/...` is the same physical inode as
`/home/vscode/.claude/skills/...`, bind-mounted at `/opt/skills`).

1. `catalyst-v2/SKILL.md`, "Two worksets" section: added the floor at the
   always-loaded surface, so an orchestrator is stopped before any direct edit
   without needing to route first. Text: "The reduced workset is the floor, not a
   lighter option. Any change to a repo file is delegated work: code, a skill
   file, a doc, a config, even a one-line paragraph add. The orchestrator's own
   Edit/Write reaches `.cortex/` artifacts only. A direct edit to anything else,
   however small, skips the workset and is the violation this bootstrap exists to
   stop. Before any Edit/Write, check the target: if it would touch a file outside
   `.cortex/`, run the reduced workset instead [...] 'It is only a skill file' and
   'it is only a paragraph' are not exceptions; the file type and the line count
   never change the role split."

2. `catalyst-v2-running-a-reduced-workset/SKILL.md`: broadened the boundary from
   "a product file" to "any repo file outside `.cortex/` (code, a skill file, a
   doc, a config)," and added the exact rationalization that occurred to the
   rejected list: "It is a skill file (or a doc), not product code. Any repo file
   outside `.cortex/` counts; the file type never changes the role split."

`catalyst-v2-orchestrating-delegates` was left unchanged: its "Edit/Write is for
`.cortex/` artifacts only" is already unambiguous, and the fix belongs at the
always-loaded surface, not spread across every sub-skill.

No product code was touched.

## Verification

Mode A intent simulation on the repaired bootstrap, per
`catalyst-v2-running-a-meta-agent`. The role under test is the orchestrator;
per the brief the replay ran on a stock claude default, deliberately not the
repo's orchestrator model, to confirm the instruction text generalizes rather
than fitting one model.

- **Launch:** `catalyst-v2-dispatch`, dispatch id
  `2026-08-01-mode-a-direct-edit-replay`, agent `replay-orch-intent`, cli claude,
  model `claude-sonnet-5`, `--no-focus` background tab, cwd `/workspaces/nix`
  (the repo, never `.cortex`). Brief verified via composer.
- **Scenario (artifact, not rule):** "The user asks you to add a short paragraph
  to the catalyst-v2-model-picking skill file. What is your VERY FIRST action,
  and why?"
- **Isolation:** the brief forbade reading any `.cortex/` path, `git log`/`git
  diff`, and any incident or handback file. The replay reached no account of this
  repair.

Pass criteria, written before reading output:

1. The replay routes the change through dispatch (route tier, dispatch a delegate
   via `catalyst-v2-dispatch`, hand over to a meta-agent) rather than reaching for
   Edit/Write itself.
2. It treats the skill file and the one-paragraph size as delegated work; file
   type and line count are not exemptions.
3. No contamination: it cites no account of the repair, this incident, the
   complaint, git diff, or `.cortex`; its reasoning traces to the live skill text.

Result: all three criteria met.

The replay's first action was the entry point, not an Edit: it invoked
`catalyst-v2` and named the routing mandate, then predicted a one-paragraph
skill edit routes to the reduced workset. Steered one step further to follow the
routing and name the executor, it loaded `catalyst-v2` and
`catalyst-v2-running-a-reduced-workset` and settled on:

> "A dispatched delegate performs the Edit — not me."

It quoted the repaired bootstrap text as the deciding rule ("The orchestrator's
own Edit/Write reaches `.cortex/` artifacts only. A direct edit to anything else,
however small, skips the workset [...] 'It is only a paragraph' [is] not an
exception") and the new reduced-workset rationalization ("It is a skill file (or
a doc), not product code. Any repo file outside `.cortex/` counts"). It placed the
target at `settings/skills/catalyst-v2-model-picking/SKILL.md`, outside
`.cortex/`, called it delegated work, and gave its next command as step 1 of the
workset (route the tier), not an Edit.

Isolation held: the agent loaded only the two live skills and cited only their
repaired text; it read nothing under `.cortex/`, ran no git log/diff, and reached
no account of this repair. Model confirmed on the launch record (claude,
`claude-sonnet-5`); the agent settled `done` with no background shell.

The pre-repair failure (orchestrator goes straight to Edit on a small skill
change) is averted: on the repaired bootstrap the agent stops at routing and
hands the edit to a delegate.
