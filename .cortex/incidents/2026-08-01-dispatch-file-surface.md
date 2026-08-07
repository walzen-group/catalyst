# The dispatch tool offered file-path input surfaces that invite prompt routing

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning files:** `catalyst-v2-dispatch/src/cli.mjs`, `.../src/preflight.mjs`,
`catalyst-v2-dispatch/SKILL.md`. Supporting: `catalyst-v2-running-a-meta-agent`
and `catalyst-v2-quickchat` (the steer-surface references in both).

**Recurrence:** yes, of `2026-08-01-quickchat-prompt-routed-via-text-file.md`.
That incident's fix was guidance-only — it named the flag purposes ("a prompt
goes on `--text`, `--text-file` is for docs") in the two SKILL.md files but left
the **tool still offering** `--text-file` and a positional dispatch-input file. A
guidance rule that a fresh agent must remember, over an affordance the tool keeps
presenting, is the weak-fix shape the recurrence rule warns about, and it did not
take: today the orchestrator passed its dispatch input as a positional
`/tmp/...json` file on **every** dispatch of this effort. This report treats that
guidance-only fix as the root cause to repair properly, at the tool surface.

## What the user wanted

Tight, explicit control over file input. Verbatim:

> dispatch and steer should have two input modes that need to be explicitly
> configured, file and prompt, where file should only be allowed if it is a
> cortex document for executing a preplanned task

and, on the shape of it:

> having both --mode prompt and --mode file and --text and --file doesnt make any
> sense, it should only be one

So: an explicit two-mode surface, the flag name itself the selector, and file
mode admitting only a cortex plan/spec doc.

## What went wrong

The tool's input surface invited file routing rather than refusing it.

- `dispatch` took its JSON from an optional **positional file argument** or
  stdin, with no signal that stdin was the intended path. The orchestrator used a
  `/tmp/*.json` positional for every dispatch this effort — the concrete usage the
  user calls the system failure.
- `steer` offered `--text-file <path>` as a co-equal alternative to `--text`, so a
  prompt could be (and in `2026-08-01-quickchat-prompt-routed-via-text-file.md`
  was) written to a temp file and sent by path.
- `brief.spec_path` was validated for existence and file-ness but not constrained
  to `.cortex`, so any on-disk path could ride in as a "spec pointer."
- `--roster-json <file>` put a third file-path argument on the command line.

None of these failed loudly; they worked, which is why the drift persisted. What
it costs is what the prior incident already named — a path to get wrong, a copy
that can drift from the words said — now compounded by the input document itself
living in a scratch `/tmp` file outside any durable, reviewable location.

## Root cause

The tool expressed input mode implicitly (a path was present, or it was not) and
offered file affordances with no gate on where the file lived. Implicit mode plus
an ungated file path is precisely what lets a prompt or an ad-hoc input document
travel as a `/tmp` file. The earlier fix addressed the reader (guidance) but not
the surface (affordance), so the affordance kept winning.

## Fix

All in this dispatch. The surface is now two modes, named by the flag itself,
exactly one per call — no `--mode` selector (it would be redundant with the
payload flag), no positional argument, no silent default.

- **`cli.mjs` — dispatch:** input is stdin (inline) XOR `--file <path>`. Passing
  both is refused; passing neither is refused; a positional argument is refused
  with a message pointing at stdin or `--file`. stdin is read only when it is not
  a TTY, so file mode never blocks. `--roster-json` is gone from the CLI; the
  roster test seam is now the env var `CATALYST_DISPATCH_ROSTER_JSON`, documented
  test-only, so no file-path argument remains on the command line.
- **`cli.mjs` — steer:** `--text` (inline) XOR `--file <path>`; both refused,
  neither refused. `--text-file` is removed entirely (now an unknown option).
- **`preflight.mjs`:** a new `requireCortexDoc` gate — a `--file` path is accepted
  only when it sits under a `.cortex/` tree and exists as a file; a `/tmp` or any
  other path is refused. The same `.cortex` constraint now applies to
  `brief.spec_path` (spec_pointer mode), alongside the existing exists/is-file
  checks.
- **`SKILL.md`:** usage, the input section, the flag-purpose paragraph, the
  brief.mode row, the Preflight list, and the test-seam note all rewritten to the
  two-mode surface. The flag-purpose paragraph now states plainly that a prompt is
  inline traffic and `--file` is not a back door for it.
- The steer-surface references in `catalyst-v2-running-a-meta-agent` and
  `catalyst-v2-quickchat` were updated in the same pass so nothing across the kit
  still points at `--text-file`.

**Orchestrator conduct, independent of the tool change.** The orchestrator's use
of a positional `/tmp` input for every dispatch today is the usage the user names
as the failure. It switches to stdin (prompt mode) effective immediately, and does
not wait on or depend on this tool change to do so — the tool merely makes the old
path impossible going forward.

## Verification

**Unit (`node --test test/*.test.mjs`): 44 pass, 0 fail** (28 prior + 4 omp/steer
delivery + 12 new for this surface). New `test/cli.test.mjs` covers: the `.cortex`
gate (`isCortexPath`, `requireCortexDoc` — cortex file ok; `/tmp`, non-cortex,
missing, and a directory all refused); `brief.spec_path` under `.cortex` accepted,
outside refused, nonexistent refused; dispatch prompt mode via stdin works;
dispatch file mode accepts a `.cortex` doc; dispatch `--file` on a `/tmp` and a
non-cortex path refused; dispatch neither-input and both-input refused; a
positional dispatch argument refused; steer `--text` delivered through the tool;
steer `--file` reading a `.cortex` doc delivered; steer neither/both refused;
steer `--text-file` refused as unknown; steer `--file` on `/tmp` refused.

**Live, through the tightened surface.** Dispatch of a two-agent wave **via
stdin** (prompt mode), `dispatch_id: 2026-08-01-final-verify-wave`: status ok,
both agents verified and working with wakes armed, `roster_reconciliation` agree.
The omp scratch agent `verify-omp2` submitted its stdin-delivered brief (wrote
`twomode-brief.txt`, no parked chip), then a `steer --text` (prompt mode) delivered
and was consumed (wrote `twomode-steer.txt`, `expect_match: true`, wake armed).
Pass criteria, fixed before the run: dispatch accepted on stdin with no positional
file, agents reach working, and an inline `--text` steer lands without a chip. All
met. Scratch tabs closed after.
