# Task 1: c2d deterministic checks (repair-gate + hand-back schema)

## Context

Catalyst is a multi-agent software system. `c2d` is its dispatch tool: a
zero-dependency Node ESM CLI under
`/Users/sam/nix/catalyst/skills/catalyst-v2-dispatch/src/`, tested with
`node --test` over `/Users/sam/nix/catalyst/skills/catalyst-v2-dispatch/test/`.
This task moves two rules that currently live only in skill prose into
deterministic tool checks, so agents stop relying on memory for structure. It is
improvement work, not a repair; no incident is involved. It defines tool
contracts, so it is test-first: write the failing test first, record the red run,
then implement to green.

## Target

Touch only:

- `/Users/sam/nix/catalyst/skills/catalyst-v2-dispatch/src/` (schema, preflight,
  steer/deliver, and a new hand-back module if you add one)
- `/Users/sam/nix/catalyst/skills/catalyst-v2-dispatch/test/`

Non-goals (scope fence): build EXACTLY the two checks below. Do not add any other
deterministic check (no incident-log scan, no deliverable-path check, no SDD
red-run citation). The pattern invites generalization; resist it.

## Change

### Check A: repair dispatch must carry an incident

Mirror the existing worker-needs-meta gate in `preflight.mjs` (read
`isExemptFromMetaGate` and the meta-gate refusal for the pattern and the refusal
message style).

- Add a repair dispatch surface. Recommended: a new agent `kind` value
  `"repair"` (extend `AGENT_KINDS` in `schema.mjs`), carrying a required
  `incident_path` field. If you find a cleaner surface, justify it in your
  report; the observable contract below is what matters.
- Preflight refuses a repair dispatch whose `incident_path` is absent, or does
  not point at an existing file under a `.cortex/incidents/` tree. Reuse the
  filesystem existence pattern already in preflight (`statSync`/`statOrNull`).
- A repair is worker-like for the meta gate: it still needs a meta present.
- Refusal message names the agent and the missing or invalid incident path,
  matching the meta-gate refusal's shape.

### Check B: hand-back completeness schema

Today a meta delivers a hand-back with `c2d steer --agent <orch> --text "..."`
and the text is opaque to the tool. Add a validated hand-back path.

- Recommended surface: a `c2d handback --agent <orch> --file <.cortex path>`
  verb that reads a structured JSON payload, validates it, and on success
  delivers it through the existing steer delivery path (the composer-hold
  refusal, `A2A:` attribution, and consumption checks in `steer.mjs`/`deliver.mjs`
  all still apply). A `steer --handback` mode is an acceptable alternative if you
  justify it.
- Required fields, each refused by name when missing or empty:
  `files_changed`, `diffs_per_worker`, `gate_evidence`, `whole_change_output`.
  `deliverable_paths` is required but may be an empty list.
- `gate_evidence` must be a reference to an existing artifact (a path or session
  id the tool can `statSync` or otherwise confirm exists), not fresh inline
  command output. This is the structural nudge against a meta re-running a gate
  instead of citing the worker's recorded run. If the reference does not resolve
  to something that exists, refuse and name the field. The tool validates
  presence and shape only; it does not and cannot judge whether the evidence is
  true.

## Constraints

- Global constraints from `00-index.md` apply: changes stay UNCOMMITTED (`git
  add` fine, no commit); report is a diff.
- Zero runtime dependencies; plain ESM; `node --test` only.
- Unknown keys are refused at every schema level already; keep that invariant.

## Acceptance

Test-first (`catalyst-v2-sdd-rules`), for BOTH checks:

1. Write the test first, capturing the wanted refusal/acceptance behavior.
2. Run it against current code and RECORD the failing run (paste it in your
   report). A test that never failed proves nothing.
3. Implement the minimal change.
4. Run to green.

Exact commands, in the pinned toolchain:

```bash
cd /Users/sam/nix/catalyst/skills/catalyst-v2-dispatch && node --test
```

Green means:

- A repair dispatch with no `incident_path` (or a non-existent one) is refused by
  preflight, message names the missing/invalid incident. A repair dispatch whose
  `incident_path` exists passes preflight (given a meta present).
- A hand-back payload missing any required field is refused, message names the
  field. A hand-back with a `gate_evidence` reference that does not exist is
  refused. A complete, well-formed hand-back is accepted and delivered.

Negative check: a normal worker/unit dispatch (no repair kind) is unaffected, and
the existing suite stays green.

Report your recorded red runs for both checks; the meta-agent confirms they exist
before accepting green.

## Report and style

Report format: files changed, `git diff --stat`, the red runs, the green run,
deviations. User-facing text in your report follows the i-have-adhd convention
(`catalyst-v2`: lead with the answer, keep it tight).
