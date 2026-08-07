# c2d inlined the multi-line persona as a CLI arg and herdr refused the launch

**Date:** 2026-08-04
**Store:** kit-level (catalyst skills)
**Owning file:** `settings/skills/catalyst-v2-dispatch/src/launch.mjs`

**Recurrence:** none. No prior incident names `--append-system-prompt` or the
`invalid_agent_argument` refusal. First filing.

## What the user wanted

The Curator subsystem launches for real. The live launch is the integration
gate for the whole plan: `c2m curate` must start a the-curator agent that runs
the memory pass.

## What went wrong

Three dispatches failed at agent start with herdr exit 1:
`curator-20260804T083626Z`, `curator-20260804T083658Z`,
`curator-20260804T084123Z` (failure ledger
`$XDG_STATE_HOME/catalyst-v2-dispatch/failures/the-curator.json`). herdr's
stderr:

```
{"error":{"code":"invalid_agent_argument","message":"agent arguments cannot be encoded safely for the target shell"}}
```

The failing argv carried the multi-line persona body inlined as one argument:
`--append-system-prompt "You are The Curator, Governor of what was, is, and
will be. ..."`. herdr refuses to shell-encode a newline-bearing argument. No
Curator has ever launched.

## Root cause

`launch.mjs` `styleArgs` translated `agent.style_file` by reading the persona
file, stripping its frontmatter, and splicing the multi-line body into the
launch command line. The task-1 unit tests validated the assembled argv
against expectations but never exercised a real herdr launch, so the shell
encoding refusal surfaced only at the end-to-end smoke test. The test seam
validated assembly, and the defect sat exactly there.

The lesson: a c2d launch-arg change needs a real-launch test, not only assembly
assertions.

## Fix

In progress in this same wave (task 11, worker impl-transport-fix): pass the
persona file by path with claude's `--append-system-prompt-file <path>`, use
the file form omp actually accepts, and drop the now-unused frontmatter strip.
The multi-line body leaves the shell-encoded args entirely.

## Verification

Fix-in-progress: verification belongs to this incident's implementing wave and
is run by that wave's meta-agent (meta-wave6) once the wave settles, in code.
Criteria:

- `node --test` green in `settings/skills/catalyst-v2-dispatch/` and
  `settings/skills/catalyst-v2-curator/` via their package scripts.
- `styleArgs` emits `--append-system-prompt-file <path>` for claude and the
  omp file form; no argument carries a newline.
- A real `c2m curate` on the scratch tree launches the-curator on the roster
  and completes a pass; this launch was impossible before the fix.
- `c2m merge` resets the target's strength to 3 and integrates the content;
  a missing target errors.
- The c2m banner em dash is gone; SKILL.md PROMOTE names `c2m merge`.

## Verification result (wave settled, 2026-08-04)

All criteria met, run in code by meta-wave6 after both workers settled:

- dispatch suite 117/117 and curator suite 34/34, both via `npm test`.
- `styleArgs`: claude yields `--settings {"outputStyle":"Default"}` plus
  `--append-system-prompt-file <path>`; omp yields `--append-system-prompt
  <path>`; the newline-bearing-arg test passes. omp's space-separated form
  confirmed live against the real CLI (marker file reached the session).
- Live launch: dispatch `curator-20260804T091026Z` launched the-curator
  (status_at_return working, brief_delivery.verified true, prior_failures
  showed only the three historical failures). It drained the inbox, promoted
  the note, decayed, reindexed, committed in the scratch repo, and handed
  back in persona voice with the ritual verdict. Scratch tree removed.
- `c2m merge` smoke: strength 2 to 3 with fresh last_relevant, content
  folded from an inbox note, clean error on a missing target.
- Banner em dash replaced with a colon; SKILL.md PROMOTE names `c2m merge`.
- Main repo untouched by commits; HEAD unchanged.

## What remains open

The recorded red run is the three failed dispatches above. The green run lands
with task 11's gate output. The incident carries no replay of its own because
the fix is product code in a worker wave; the criteria above are the gates that
wave's meta must run.
