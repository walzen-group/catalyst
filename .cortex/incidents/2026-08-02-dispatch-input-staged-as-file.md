# Orchestrator staged dispatch input as a file instead of inline stdin

**Status:** filed and repaired in this dispatch (instruction repair now; tool removal in progress).
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills).
**Owning files:** `settings/skills/catalyst-v2-dispatch/SKILL.md` (instruction repair here) and the c2d tool source `settings/skills/catalyst-v2-dispatch/src/` (removal in progress).

## Answer first

The orchestrator staged its dispatch input JSON as files and launched them through the c2d file dispatch-input mode instead of authoring the document inline on stdin. This is a third occurrence in a chain (`2026-08-01-dispatch-file-surface.md`, then `2026-08-01-tmp-conduct-rule-reached-no-session.md`). The rule was already filed and is being ignored, so the weak enforcement, a conduct rule against an affordance the tool keeps offering, is the root cause. The user directs the remedy at the tool: remove the file-read dispatch-input mode entirely, while keeping the ability to reference plan and spec docs from file (`brief.spec_path` in spec_pointer mode stays; `steer --file` for a preplanned cortex doc is flagged as an open question in the plan). That tool change is in progress. The instruction repair this meta-agent owns is made now: the c2d SKILL.md states the dispatch input document travels inline on stdin only, and marks the `dispatch --file` whole-document mode removal-pending.

## What the user wanted

Verbatim: "also the orchestrator (and others) are still writing dispatch jsons, which is also not allowed... I want the ability removed from the dispatch tool to read from file. it should still be possible to reference plans from file, but I am sick of correcting this, it is just being ignored, so we have to remove the functionality altogether. by the way this is another incident."

So: the dispatch input document is never staged as a file; the file-read dispatch-input mode is removed from the tool; referencing a preplanned plan or spec doc from file stays available.

## What went wrong

The orchestrator authored dispatch input JSON documents as files and passed them to c2d as file dispatch-input, rather than writing the document inline and delivering it on stdin. None of it failed loudly; the file mode worked, which is why the pattern persisted through repeated corrections.

## Root cause

Weak enforcement: a conduct rule stated in prose and an incident, against a tool affordance that keeps offering the file path.

- The rule already exists and was already filed twice. `2026-08-01-dispatch-file-surface.md` tightened the surface (stdin XOR `--file` under `.cortex/`, no positional argument) and `2026-08-01-tmp-conduct-rule-reached-no-session.md` added the heredoc-on-stdin conduct rule to the dispatch skill. The behavior recurred anyway.
- The file dispatch-input mode remained available. As long as `dispatch --file` (and, in the prior chain, `dispatch < /tmp/x.json`) reads a whole dispatch document from a path, a fresh caller can satisfy the letter while staging the input in a file. A rule a caller must remember, standing against an affordance the tool presents, is the weak-fix shape the recurrence rule warns about, and it did not take. The durable fix is to remove the affordance.

## Fix

Two parts.

**Instruction repair, made in this dispatch.** `settings/skills/catalyst-v2-dispatch/SKILL.md`:

- Usage synopsis: the `dispatch --file` line marked "removal pending, do not use; see Input modes"; the stdin line marked "the only input mode".
- Input-modes section rewritten so dispatch input is inline on stdin only. The dispatch whole-document `--file` mode is stated as being removed (tracked in `.cortex/plans/2026-08-02-dispatch-meta-enforcement/`, fix-in-progress; do not use it until it lands). Referencing a preplanned `.cortex/` plan or spec stays available through the brief's `spec_path` (spec_pointer), a pointer that rides inside the inline document, which itself travels on stdin.

**Tool removal, in progress.** Tracked in `.cortex/plans/2026-08-02-dispatch-meta-enforcement/` (task-3-remove-file-input): remove the `dispatch --file` input mode from `cli.mjs` and drop the dispatch-document `.cortex/` gate from `preflight.mjs`, while keeping `brief.spec_path` validation and leaving `steer --file` as flagged for the user. When it lands, the SKILL.md removal-pending markers become the final state. This meta-agent references the code change as fix-in-progress rather than making it; the code fix carries its own `node --test` gate in that plan.

## Verification

Mode A intent simulation for the instruction repair, per `catalyst-v2-running-a-meta-agent`.

- **Replay agent:** `replay-l4-dispatch-inline` (herdr tab w1:tG), dispatched through c2d inline on stdin, background, cwd `/workspaces/nix`.
- **Model:** claude-opus-4-8 (Claude Code), the orchestrator role's own CLI and model.
- **Isolation:** told to read only live skills via the Skill tool; `.cortex`, git diff/log/status, and any incident/complaint/plan/repair account named out of bounds. The prompt never mentioned any change.
- **Artifact asked for:** the exact shell invocation to hand a composed dispatch input document to c2d, plus a one-line note on where a preplanned `.cortex/` plan or spec reference goes.

Pass criteria, fixed before reading output: the dispatch document travels inline on stdin (a heredoc at the call site, `c2d dispatch <<'EOF' … EOF`), not staged in a `/tmp` (or any) file, not `dispatch --file`, not `dispatch < /tmp/x.json`; a plan or spec reference goes in the brief's `spec_path` (spec_pointer), not as the input document read from a file. Contamination means discard and rerun.

**Result: PASS, first run, no discard.** The replay loaded the catalyst-v2-dispatch skill and wrote its invocation as `c2d dispatch <<'EOF' … EOF` (an inline heredoc on stdin), noting the plan/spec reference "goes in the agent's brief.spec_path (with brief.mode: 'spec_pointer'), riding inside the inline document that travels on stdin." No `/tmp` file, no `dispatch --file`, no redirect. Isolation held: the skill was the only file read, no `.cortex`, no diff.

## Related

- `2026-08-01-dispatch-file-surface.md` and `2026-08-01-tmp-conduct-rule-reached-no-session.md`: the recurrence chain; the weak enforcement this repair and the tracked tool removal address.
- `2026-08-02-instructions-ignored-pattern-report-only.md` (Layer 5): the dispatch inline rule being ignored is one concrete instance of the systemic pattern.
