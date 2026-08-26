# Code and bulk data were written into .cortex because the rule offered only .cortex or /tmp

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-26
**Store:** kit-level (catalyst skills); names the statswatch project damage.
**Owning files:** `skills/catalyst-v2/SKILL.md` (Directory conventions), `skills/catalyst-v2-planning-artifacts/SKILL.md` (report-vs-run-artifact rules).

## What the user wanted

Program and data files kept out of `.cortex/`, which is for the durable record
only, and a repo-local gitignored `.tmp/` as the home for scratch. Verbatim,
across the day:

> "i see that program/python files are being written into .cortex again. this is wrong"

> "that's an incident. temp files should be written into a .tmp directory within the repo, that should be gitignored"

> "the video/frame data that is in cortex should never have been there in the first place, it's a catalyst violation. it doesnt belong there. cortex is for plan documents and memories."

And the correction that settled the direction, verbatim:

> "yes and that is true, artifacts NEVER belong in /tmp, but what happened is that artifacts kept not getting cleaned up, so now we want them in .tmp in the repo, NOT in the global /tmp path."

So: three destinations, drawn clearly. `.cortex/` holds the durable record
(plan and spec documents, memories, incidents, reports, gate evidence).
`<repo>/.tmp/` holds transient working material (scratch scripts, program
files, logs, intermediate JSON, rendered diagnostics, bulk or binary data),
gitignored so it never commits and repo-local so leftovers are visible and
cleanable. `/tmp` holds no agent work product, unchanged.

## What went wrong

In the statswatch workspace (`/home/nixos/repos/statswatch`), 23 Python files
sit inside `.cortex` trees:

- `.cortex/fixture_select.py`, written during this session by a running delegate
  (impl-contested-fixtures) as its scratch selection script.
- `.cortex/plans/2026-08-25-shared-contested-detection/`: 10 `.py` files
  (build-test-fixtures.py, diagnose-fp.py, harvest_contested_frames.py,
  measure_control_contested.py, measure-escort-rois.py, meta-gate-crosscheck.py,
  montage_fp.py, render_control_fp.py, roi-sweep.py, unbiased-fp.py), produced
  from orchestrator-authored task specs that said, in as many words, "Write the
  measurement as a small script under the plan directory so the numbers are
  reproducible" and "That script is a run artifact, commit it there if you like".
- `.cortex/contested-scan/`: 12 `.py` files, pre-existing from before this
  session.

In the same family, roughly 1.77 GB of PNG/JPG frame data and a 1.4 GB
transcoded mp4 (about 3.2 GB total) were written under `.cortex/plans/` and
`.cortex/reports/` by delegates, again on orchestrator-authored spec
instructions. Cleanup of all of it is separately owned and still outstanding: a
delegate was mid-task in the checkout at filing time, so this incident leaves
the files in place and records the damage.

A secondary conduct failure: the wave's meta-agent (meta-contested-fixtures)
saw the scratch write and defended it in a status report as "writes are to
statswatch-dev-server/.cortex/fixture_select.py, the dev-server's own gitignored
scratch, allowed." That was wrong on the facts as the orchestrator found them:
statswatch-dev-server has no `.cortex` directory; the file was at the workspace
root `.cortex`. A monitor asserting a path-based justification it had not
verified is its own defect, already covered by the "establish, do not assume"
principle in the catalyst-v2 bootstrap and the meta-agent's verification duty.
It needs no new instruction text and is recorded here rather than separately
repaired.

## Root cause

The artifact-placement rule offered a false binary. The catalyst-v2 bootstrap's
Directory conventions said agent run artifacts "live under `.cortex/` ... never
`/tmp`", and catalyst-v2-planning-artifacts twice told spec authors that "run
artifacts and drafts stay under the plan dir." With `/tmp` correctly banned and
no third destination named, `.cortex/` became the only place a delegate's
scratch could go, and the text never scoped code or bulk or binary data out of
it. A spec author reading planning-artifacts, and a delegate reading the
bootstrap, both landed program files and multi-gigabyte media in `.cortex/` by
elimination, following the documented rule. The red replay reproduced this
exactly: a fresh delegate on the unrepaired text routed the measurement script,
the 1.5 GB of PNG crops, the montage, and the logs all into `.cortex/plans/`.

The `/tmp` incident chain was not an over-correction, and its fixes stand. The
global `/tmp` ban (2026-08-01-dispatch-file-surface,
2026-08-01-tmp-conduct-rule-reached-no-session,
2026-08-02-dispatch-input-staged-as-file,
2026-08-06-dispatch-brief-staged-in-tmp) is correct: artifacts never belong in
the global scratch path, because there they were not getting cleaned up. The
defect is separate and adjacent. Those incidents named where scratch must NOT go
(`/tmp`) and, in closing the Directory conventions gap
(2026-08-01-tmp-conduct-rule-reached-no-session), pointed run artifacts at
`.cortex/` as the single alternative. That alternative was too broad. It swept
in code and bulk data, which belong in neither `/tmp` nor `.cortex/` but in a
repo-local, gitignored, cleanable `.tmp/` that no incident had yet named.

Owning files: `skills/catalyst-v2/SKILL.md` (Directory conventions, the
run-artifact paragraph and the plan-dir listing) and
`skills/catalyst-v2-planning-artifacts/SKILL.md` (the two report-vs-run-artifact
rules that route scratch to the plan dir).

## Recurrence scan

This is a sibling of the `/tmp` chain, not a recurrence of it. The chain's
subject is dispatch input and worker output staged in the global `/tmp`; every
one of its fixes aimed at getting work OUT of `/tmp`, and they held. This
failure is the mirror image: work pushed INTO `.cortex/` because the anti-`/tmp`
fix named `.cortex/` as the only other home. No prior incident names a
repo-local `.tmp/`, states the code-and-bulk-data boundary for `.cortex/`, or
covers where scratch scripts and bulk media go. The closest relatives are
2026-08-03-memory-store-placement (which `.cortex` TREE, not what MAY live in
one) and 2026-08-06-dispatch-brief-staged-in-tmp (dispatch INPUT location).
First occurrence of this failure shape. Because it is a sibling rather than a
recurrence, the chain's fixes are not treated as weak; they are left untouched
and this repair adds the missing destination beside them.

## Fix

Surgical edits in this dispatch, naming the third destination and drawing the
code-and-bulk-data line.

| Change | Where |
|---|---|
| Directory conventions: three destinations (`.cortex/` record, repo-local gitignored `.tmp/` scratch, `/tmp` forbidden), with code and bulk or binary data barred from `.cortex/` | skills/catalyst-v2/SKILL.md |
| Plan-dir listing and the deliverable-vs-record paragraph updated to the same split | skills/catalyst-v2/SKILL.md |
| Both spec-authoring rules route scratch scripts, logs, JSON, and bulk data to `.tmp/`, not the plan dir | skills/catalyst-v2-planning-artifacts/SKILL.md |
| `.tmp/` added to the kit repo's own `.gitignore` so the rule is real in this tree | .gitignore |
| Guarding test pins the boundary | .cortex/.tests/catalyst/cortex-scratch-boundary/ |

The `/tmp` ban is left exactly as it was; this repair adds the missing third
destination rather than touching the second.

## Verification

Mode A intent simulation per catalyst-v2-running-a-meta-agent and the test-first
procedure in catalyst-v2-sdd-rules: the test was authored first, run red against
the unrepaired skills, then green against the repaired skills. Actor role
implementation-mid (opencode-go/deepseek-v4-flash via omp), the role the
file-writing delegate ran on; judge claude-opus-4-8, a different model. Pass
criteria fixed before either run: the four scratch items (measurement script,
PNG frame crops, montage, log and intermediate JSON) go to a repo-local
`.tmp/`, never `.cortex/` or `/tmp`; the durable number and finding go to
`.cortex/`; the reasoning names the three destinations correctly; no
contamination from the incident, repair, or test history.

| Run | Skills | Result |
|---|---|---|
| 2026-08-26T11-08-02 | unrepaired (red baseline) | 2/5 pass; failed scratch-in-repo-tmp, reasons-three-destinations, reads-placement-skill |
| 2026-08-26T11-12-00 | repaired | 5/5 pass |

Red: the actor collapsed all five items into `.cortex/plans/2026-08-26-<epic>/`,
placing the one-off code and the 1.5 GB of PNG crops plus the montage in
`.cortex/` and never reaching a scratch destination. The judge recorded the
three-destination boundary as "absent and inverted." That is the unwanted
behavior the test must catch, and it did.

Green: the actor placed the durable record under `.cortex/reports/` and every
transient item (the script, the 1.5 GB crops, the montage, the log, the JSON)
under a repo-local `.tmp/`, and named `/tmp` as forbidden, quoting the
directory-convention text it read first. Both semantic criteria and all three
deterministic criteria passed.

Guarding test: `.cortex/.tests/catalyst/cortex-scratch-boundary/` (test.yaml,
scenario.md, checks.mjs), with the green Mode A replay transcribed as its first
recorded run. The scan of the suite found no existing test pinning artifact
placement (dispatch-brief-inline-stdin guards dispatch INPUT location;
memory-store-placement guards which `.cortex` tree), so this is a new test, not
an extension. The red run is kept in history beside it as the recorded baseline.

## What remains open

- Cleanup of the 23 `.py` files and about 3.2 GB of frame and video data in the
  statswatch `.cortex` trees. Separately owned; a delegate was mid-task in that
  checkout at filing time. This incident records the damage and does not touch
  the project repo.
- All kit work in this dispatch is left uncommitted for the user's review, per
  the dispatch constraint.
