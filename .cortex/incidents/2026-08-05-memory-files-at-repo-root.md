# Memory files appeared at the repo root, and three store entries had no ledger rows

**Date:** 2026-08-05
**Store:** kit-level (`/workspaces/nix/.cortex/incidents/`)
**Status:** filed and repaired in this dispatch
**Owning files (primary):** `settings/skills/catalyst-v2-in-repo-agent-memory/SKILL.md`
(Writing memory), `settings/skills/catalyst-v2-curator/SKILL.md` (verb surface,
Pass, single-writer), `settings/skills/catalyst-v2-filing-incidents/SKILL.md`
(Incidents and durable memory), `settings/skills/catalyst-v2-curator/src/store.mjs`
(promote/resurrect write order, the new adopt verb),
`settings/skills/catalyst-v2-curator/src/cli.mjs` (adopt routing),
`settings/skills/catalyst-v2-curator/src/dispatch.mjs` (curate brief).

**Recurrence:** none filed under this shape. Scanned both incident stores for
memory/root/litter/ledger/stray-file patterns; no prior incident covers memory
files written outside the store tree or content files missing ledger rows.
Closest family: `2026-08-03-memory-store-placement` (which `.cortex` tree owns
what) and `2026-08-04-curator-enforces-single-home` (directive entries in the
store). Neither states the write mechanism.

## What the user wanted

Memory lives in one place, `.cortex/memory/`. The in-repo-agent-memory skill's
Setup and migration section names the failure explicitly: two live memory
locations is the failure to avoid. Nothing should write a memory file to the
repo root. The user's words, verbatim: "there are memory files in the project
root :O", "that shouldnt be".

## What went wrong

Three untracked files sat at the repo root: `feedback-agent-self-identity.md`,
`feedback-dispatch-mandate-harness-skill.md`,
`feedback-steer-failure-not-delivery-proof.md`, all mtime 2026-08-05 07:12:16,
writes spaced 20-22 ms apart (three separate process invocations). Each is
byte-identical to its copy in `.cortex/memory/.tombstones/` except the
tombstone copy carries the `curator_description` frontmatter prune stashes
(verified for all three by diff against the tombstone bodies). The tombstone
copies are the pre-prune live store files, so the root copies are exact
duplicates of store content, made during the 07:09-07:13 curator pass, 55
seconds before prune moved the originals.

The store side: the same three files had sat in `.cortex/memory/` since
2026-08-04 with no ledger row and no git tracking (9 other feedback files were
tracked; these three never were). They were written by hand, outside the c2m
verbs. The 07:13 pass found them ("files without rows, left there by an earlier
hand"), gave them rows, judged them as skill pointers, and pruned them to
tombstones with the rest. The drain itself was intended and is correct; the
post-drain store state (one entry,
`project-2026-08-03-catalyst-conventions`) is untouched by this dispatch.

## Killed hypothesis, on the record

The user asked, verbatim: "could it be that it is a c2m inbox bug where it
places the files in the cwd instead of the memory inbox dir". Killed. The
evidence:

- Source trace of the inbox write path: `note()` in `src/inbox.mjs` resolves
  `const { inbox } = treePaths(tree)` and writes `join(inbox, '<id>.md')`;
  `treePaths` (src/paths.mjs) joins every path against `String(tree)`. No
  `process.cwd()` exists anywhere in the c2m source; the only `cwd` in the
  tree is `cwd: tree` in `dispatch.mjs`, which sets the curator tab's working
  directory to the tree itself.
- File-shape mismatch: `c2m note` names a note
  `<compact-stamp>-<agent>-<slug>.md` (real example from this dispatch's
  verification run: `20260805T072700Z-probe-the-staging-db-rejects-writes-between.md`)
  with `agent:` and `ts:` frontmatter, written into `<tree>/inbox/`. The three
  strays are `feedback-<slug>.md` content-file shapes, H1 prose, no
  frontmatter, byte-identical to the store's content files. A cwd bug in the
  note writer would leave timestamped, frontmattered note files at the root,
  not content files.
- Timing: the strays were written at 07:12:16, inside the curator pass, three
  minutes after dispatch; any inbox notes for these lessons would have been
  dropped on 2026-08-04.

The corroborating observation (an `inbox list --tree /workspaces/nix` reading
empty) has a different explanation: `/workspaces/nix` is not a memory tree, so
`inbox list` reads `/workspaces/nix/inbox`, which does not exist and reads
empty. The empty read is a wrong-tree caller, the same wrong tree that produced
the strays.

## Root cause

Two distinct causes, one tool and one instruction; they chain.

**1. Tool: promote (and resurrect) write the content file before validating
the store.** In `store.mjs`, `promote` wrote the content file first and read
the ledger after; `resurrect` wrote the live file and unlinked the tombstone
before the ledger read. A failed invocation (wrong `--tree`, missing ledger)
therefore still littered a content file at whatever path the tree resolved to,
then reported the failure. The plan index for the closing effort
(`.cortex/plans/2026-08-04-catalyst-memory-to-skills/00-index.md`) modeled the
wrong tree throughout (`c2m resurrect <slug> --tree /workspaces/nix`), and the
pass's own curate invocation carried the same value, so the curator's first
three promote attempts resolved the tree to the repo root: each wrote a store
content file at the root and then failed on the missing ledger (the failure
message names the wrong ledger path). The curator corrected the tree for the
rest of the pass; the three root files remained as invisible litter. The 20-22
ms spacing between the writes matches three sequential c2m process
invocations. The deliberate-copy alternative (a `cp` batch) is not ruled out
by the file evidence alone; both paths are closed by this repair, and the
write-order defect is the only c2m code path that can place content at a wrong
path.

**2. Instruction: nothing said a memory file is not written by hand.**
`catalyst-v2-in-repo-agent-memory` named the inbox as "the default capture
path", which implies alternatives; `catalyst-v2-filing-incidents` said "write
both when the lesson generalizes" (incident plus durable memory) without
naming the mechanism. The three files were created that way: the incident
meta-agent that filed `2026-08-04-agent-self-identity` recorded in its report
that "a feedback entry `feedback-agent-self-identity.md` is added under
`.cortex/memory/` with a MEMORY.md index line", and the other two files carry
the same hand-written shape. Hand writes produce content files with no ledger
row: store drift that the ledger machinery cannot see, and that the Curator
had no sanctioned verb to reconcile (promote forces a rewrite at full
strength), which pushed the pass to hand-row the ledger despite the
single-writer rule. The two causes chain: the instruction gap created the
ledger-less files, and the tool gap turned the curator's reconciliation
attempt into root litter. **3. Caller-facing ambiguity: the --tree value was never stated as the
memory tree itself.** `treePaths()` takes `--tree` as the memory tree root
directly, with no `.cortex/memory` derivation, so the correct value is
`/workspaces/nix/.cortex/memory`. Every orchestrator-facing call site across
the skills showed a bare placeholder: `c2m housekeeping --tree <tree>`
(orchestrating-delegates, reduced-workset, session-save-resume),
`--tree <p>` (consolidating-plans, the curator verb table), `--tree <path>`
(in-repo-agent-memory). The curator skill stated that `--tree` names one
`.cortex/memory` tree, which is true and still abstract; an orchestrator
reading "tree" reasonably reads the project tree. The orchestrator confirms
on the record: it passed `/workspaces/nix` on every c2m call this session
(inbox list, curate, and the plan index examples), and its "the inbox is
empty" reading was a wrong-tree read of `/workspaces/nix/inbox`, a directory
that never existed. That call is the trigger that produced both earlier
causes: the wrong-tree promote invocations wrote the root files, and the
wrong-tree reads hid the real state. The two causes above explain what the
wrong call did; this one explains why the call was made.

## Fix

Made in this dispatch. No file under `.cortex/memory/` was touched; the drain
state stands.

1. `src/store.mjs`: `promote` and `resurrect` now read the ledger (validating
   the tree) before any write or move. A failed promote or resurrect writes
   nothing. `merge` already validated first.
2. `src/store.mjs`, `src/cli.mjs`: new `c2m adopt <slug> [--desc "<line>"]
   --tree <p>` verb. It brings an existing ledger-less content file into the
   ledger at full strength, preserving the file's content and its existing
   index line (else `--desc`, else the H1 title). It refuses a missing file
   and an existing row. This is the reconciliation verb for store drift.
3. `src/dispatch.mjs` (curate brief): a constraint paragraph, delivered to
   every future curator: store writes happen only through the c2m verbs, into
   the tree only; a ledger-less content file is adopted with `c2m adopt`, or
   reported; never copy store content outside the tree, never hand-edit the
   ledger.
4. `catalyst-v2-in-repo-agent-memory/SKILL.md`, Writing memory: capture goes
   through the inbox, the only capture path. No agent writes a memory content
   file, a ledger row, or an index line by hand; a content file without a
   ledger row is a broken state, the signature of a hand write, reported
   rather than added to; memory content lives only inside `.cortex/memory/`.
5. `catalyst-v2-filing-incidents/SKILL.md`, Incidents and durable memory: the
   durable-memory record is dropped as a `c2m note` into the tree's inbox,
   never written as a content file by hand.
6. `catalyst-v2-curator/SKILL.md`: the verb table gains the adopt row; the
   Pass gains an ADOPT step before CLASSIFY; the single-writer bullet names
   adopt as the only sanctioned way to give a ledger-less file a row and
   states that store content never leaves the tree; the guardrail extends the
   in-tree rule to every artifact.
7. The three stray root files were deleted after this incident recorded their
   content and verified byte-identity against the tombstone bodies (see
   Verification).
8. `src/cli.mjs`: the wrong-tree guard. Every verb refuses a `--tree` value
   that is not itself a memory tree (no `.curator/`, no MEMORY.md) but
   contains a `.cortex/memory` memory tree, with `Did you mean
   <path>/.cortex/memory?`, so the call that produced this incident now
   self-corrects instead of reading an empty inbox or writing to the project
   root. The usage text states the value with the concrete kit example.
9. Orchestrator-facing call sites now carry the right shape: `c2m
   housekeeping --tree <project>/.cortex/memory` in orchestrating-delegates
   (step 7), running-a-reduced-workset (step 4), session-save-resume, and
   consolidating-plans; `c2m note "<text>" --tree <project>/.cortex/memory`
   and `c2m housekeeping --tree <project>/.cortex/memory` in
   in-repo-agent-memory.
10. `catalyst-v2-curator/SKILL.md`, verb surface: the definition states the
    value is the memory tree directory itself, never the project root, with
    the absolute kit example (`/workspaces/nix/.cortex/memory`, not
    `/workspaces/nix`).

## Verification

Three legs, matching what changed.

**c2m suite.** `cd settings/skills/catalyst-v2-curator && npm test`: 64/64
pass, 0 fail (55 prior tests plus 9 new: promote-with-no-ledger writes
nothing; resurrect-with-no-ledger writes nothing and keeps the tombstone;
adopt rows a ledger-less file; adopt preserves index lines and refuses bad
inputs; two adopt CLI-routing tests; the curate-brief adopt assertion; the
wrong-tree guard refused on four verbs with the intended path and nothing
scaffolded at the project root; a valid tree and a fresh init path not
refused). Output tail: `tests 64 / pass 64 / fail 0 / duration_ms 50.1`.

**Real exercise of the path** (the installed `c2m` is a symlink into this
tree, so the fixes were live), run under
`.cortex/plans/2026-08-05-memory-files-at-repo-root/verify/`:

- Original failure replay: `c2m promote feedback-never-written --desc "a
  lesson" --tree ./wrongtree` against a ledger-less directory exits 1 with
  `promote: ledger not found at wrongtree/.curator/ledger.json`, and the
  directory stays empty. Pre-fix, the content file landed at the resolved
  path and the same failure followed.
- `c2m adopt feedback-handwritten --tree ./realtree` on a hand-written file
  returned `{"status":"ok","slug":"feedback-handwritten","strength":3}`, the
  ledger gained the row, MEMORY.md gained the line, content untouched.
- A full mini-pass (note, inbox list, promote --from-inbox, inbox done,
  decay with relevance, decay, decay, prune, reindex) ended with the
  strength-0 entry tombstoned and the relevant entry surviving, proving the
  pass verbs are intact around the new path.

**Wrong-tree guard, exercised against the actual wrong call.** The exact call
the orchestrator made this session now refuses before any read or write:

- `c2m inbox list --tree /workspaces/nix` exits 1:
  `--tree names a .cortex/memory tree directly; "/workspaces/nix" is not one.
  Did you mean /workspaces/nix/.cortex/memory?`
- `c2m housekeeping --tree /workspaces/nix --dry-run` and
  `c2m note "probe" --tree /workspaces/nix` refuse identically; nothing was
  scaffolded or written at the project root.
- `c2m inbox list --tree /workspaces/nix/.cortex/memory` still exits 0.

**Mode A intent simulation** (instruction-file fix), pass criteria written
before the run, run through the integration-test runner so the replay is also
the guarding test's first recorded run.

- Replay/run id: `2026-08-05T07-28-05`, guarding test
  `memory-store-write-path` under `.cortex/.tests/catalyst/`.
- Actor: the Curator role, model sonnet (claude), started in the test's own
  directory. Judge: claude-opus-4-8, distinct from the actor.
- Isolation: the actor read only the live skills under
  `settings/skills/catalyst-v2-*`; it reached no incident report, plan,
  hand-back, memory tree, `~/nix/.cortex`, or git.
- Scenario: one pass over a store holding a genuine reference (strength 3), a
  spent entry (strength 0), and a ledger-less content file an earlier hand
  wrote directly; one inbox fact note; the actor states the verb sequence and
  the hand-back.
- Result: 4/4 pass, first run, no discard. The actor opened with `c2m adopt
  feedback-pager-rotation` ("it's reconciliation, not a rewrite"), ran the
  full sweep around it, wrote no store content outside the tree, and its
  hand-back named the adoption and carried the rule-enforcement section.
  Contamination scan clean; judge: "adopted the ledger-less E3 via the
  correct verb without content writes outside the tree, and ran the full
  sweep with a hand-back that names the adoption and includes rule
  enforcement."

Guarding test: `memory-store-write-path` (test.yaml, scenario.md, checks.mjs)
with this replay as its first recorded run (`history/2026-08-05T07-28-05`).
Suite README row updated. Covered files: in-repo-agent-memory, curator,
filing-incidents skills plus the three c2m source files.

Second Mode A intent simulation, for the call-site fix (the third root
cause), run through the same runner:

- Replay/run id: `2026-08-05T07-35-55`, guarding test
  `memory-tree-path-shape` under `.cortex/.tests/catalyst/`.
- Actor: meta-agent role (opencode-go/deepseek-v4-flash), scenario casting
  the orchestrator closing an effort at `/workspaces/nix`. Judge:
  claude-opus-4-8, distinct from the actor.
- Scenario: state the `c2m housekeeping` and `c2m note` commands for the
  effort with their full `--tree` values, and what the value must be, in one
  line.
- Result: 3/3 pass, first run, no discard. The actor grounded in the
  curator skill's verb surface and produced `c2m housekeeping --tree
  /workspaces/nix/.cortex/memory --effort <plan dir>` and `c2m note ... --tree
  /workspaces/nix/.cortex/memory`, then stated: "The value must be the memory
  tree directory itself, <project-root>/.cortex/memory, never the project
  root." Contamination scan clean; judge: "Both c2m commands use the
  memory-tree path for --tree, and the actor explicitly states in its own
  words that the value is the memory tree and never the project root."

Guarding test: `memory-tree-path-shape` with this replay as its first
recorded run (`history/2026-08-05T07-35-55`). Suite README row updated.

**Deletion.** Each root file diffed against its tombstone body
(`diff <(cat $f.md) <(sed '1,3d' .tombstones/$f.md)`): all three
IDENTICAL-TO-TOMBSTONE-BODY. Their content is preserved byte-identically in
`.cortex/memory/.tombstones/feedback-agent-self-identity.md`,
`.cortex/memory/.tombstones/feedback-dispatch-mandate-harness-skill.md`, and
`.cortex/memory/.tombstones/feedback-steer-failure-not-delivery-proof.md`
(the tombstone bodies, which are the root files' exact bytes). Deleted after
this incident was written.

## What remains open

- The plan index `2026-08-04-catalyst-memory-to-skills/00-index.md` carries
  `--tree /workspaces/nix` examples that model the wrong tree. It is a
  terminal plan's historical record; this dispatch leaves it. The repaired
  brief and skill now state the tree explicitly on every pass, the
  orchestrator-facing call sites carry the `.cortex/memory` suffix, and c2m
  refuses the project-root shape with the intended path, so a reader of the
  index who copies its commands gets a self-correcting refusal, not a silent
  wrong call.
- The 9 tracked feedback files and the untracked three now sit only in
  `.tombstones/`, where they belong; resurrection is the sanctioned path back
  (`.cortex/memory/.tombstones/` stays sacred).
