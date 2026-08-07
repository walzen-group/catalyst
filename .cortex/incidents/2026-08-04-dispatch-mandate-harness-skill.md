# 2026-08-04: dispatch mandate loads skills by filesystem path, bypassing the harness skill mechanism

## What the user wanted

The injected c2d dispatch mandate must tell a freshly launched agent to load
the catalyst bootstrap skill and its role skill through the harness skill
mechanism, using the canonical invocation form this environment supports
(`skill://` URIs). The mandate stays concise, precedes the authored brief, and
is recorded byte-identically in the dispatch result.

## What went wrong

The c2d dispatch mandate pinned in `deliver.mjs` read:

    CATALYST MANDATE: you are <identity>. Before any other action, read
    and follow the catalyst bootstrap skill (catalyst-v2) and the skill that
    owns your role, both under <skill root>, then the brief that follows.

It named a filesystem path (`<skill root>`, resolved from
`CATALYST_SKILL_ROOT` or `~/nix/settings/skills`) and instructed a raw read
there. That bypasses the harness skill-loading mechanism: skill routing,
invocation semantics, and harness-level provenance or session behavior never
engage. The user filed the failure for the record.

## Root cause

The instruction gap sits in `settings/skills/catalyst-v2-dispatch/src/deliver.mjs`
(`MANDATE_LINES`), which owns the pinned text injected ahead of every dispatch
brief. The guard test `dispatch-skill-mandate` pinned the same wording in its
scenario and criteria, so the wrong mechanism was locked in on both sides.
`catalyst-v2-dispatch/SKILL.md` documented the path-based mechanism in prose.
A fresh agent reading the mandate follows its letter: it reads files at a
path, and the harness never sees the load. The mandate pinned the wrong
mechanism on both sides: the code and the guard test that locks the wording
in.

## Fix

Edited, in this dispatch:

- `settings/skills/catalyst-v2-dispatch/src/deliver.mjs`: the mandate now reads

      CATALYST MANDATE: you are <identity>. Before any other action, load
      the catalyst bootstrap skill (skill://catalyst-v2) and, through the
      harness skill mechanism, the skill that owns your role; then follow
      the brief that follows.

  `catalystMandate` substitutes only the identity; `CATALYST_SKILL_ROOT` leaves
  the delivered text byte-identical. Dead `homedir`/`join` imports removed.
  Identity substitution (incident `2026-08-04-agent-self-identity`) preserved.
- `settings/skills/catalyst-v2-dispatch/SKILL.md`: mandate paragraph now
  describes harness loading via `skill://` URIs, no skill root.
- `settings/skills/catalyst-v2-dispatch/test/deliver.test.mjs` and
  `test/launch.test.mjs`: mandate helpers and assertions updated to the
  harness form; the root-carrier test became a no-path/no-read guard; the
  `CATALYST_SKILL_ROOT` override test became a byte-identity-under-env test.
- `.cortex/.tests/catalyst/dispatch-skill-mandate/`: scenario mandate text,
  test.yaml rule description, and the semantic criterion updated to harness
  loading; a new deterministic criterion `harness-not-path` added to
  test.yaml and checks.mjs; the forbidden-source scan now names this
  incident.

`catalyst-v2-writing-delegation-specs/SKILL.md` needed no edit: its mandate
mention is mechanism-neutral.

## Verification

| Check | Evidence | Result |
|---|---|---|
| Red run (test-first) | `.cortex/plans/2026-08-04-dispatch-mandate-harness-skill/red-run-mandate.txt` | New tests against pre-fix `deliver.mjs`: 6 fail, exit 1 |
| Green run (deterministic) | `.cortex/plans/2026-08-04-dispatch-mandate-harness-skill/green-run-mandate.txt` | c2d suite `node --test`: 130 pass, 0 fail, exit 0 |
| Mode A replay, run 1 | `.cortex/.tests/catalyst/dispatch-skill-mandate/history/2026-08-04T21-24-22` | 3/4: `harness-not-path` tripped on the scenario's own isolation text and the harness's `Resolved path:` lines; check regex tightened to the old mandate's wording (`both under`, `skill root`) |
| Mode A replay, run 2 | `.cortex/.tests/catalyst/dispatch-skill-mandate/history/2026-08-04T21-28-40` | 4/4 pass, regressions 0; actor's first actions are the two `skill://` loads through the harness, no directory path cited |

The mandate delivered ahead of the brief is byte-identical to what
`brief_text_delivered` records, unchanged in mechanism by this fix.
