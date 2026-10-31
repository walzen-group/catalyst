# Implementer contract: c2d claude composer title border

Filled by meta-c2d-nyx-delivery for the tooling implementer the orchestrator launches. The incident is
`.cortex/incidents/2026-10-31-c2d-claude-composer-title-border.md` (required by c2d preflight for a
repair dispatch). Read that report before editing; this page is the operational brief.

## Launch

| Field | Value |
|---|---|
| roster name | `impl-c2d-composer` (or another unique name; tell the meta the name you launch) |
| cwd | `/etc/nixos/nix/catalyst` |
| kind | `repair`, with `incident_path` set to the incident file; c2d preflight requires the incident for this kind |
| incident_path | `/etc/nixos/nix/catalyst/.cortex/incidents/2026-10-31-c2d-claude-composer-title-border.md` |
| runtime | omp in a herdr tab, through `c2d dispatch` |
| model | `opencode-go/deepseek-v4.1-flash` |
| thinking | `max` |
| fallback | none; do not escalate the model, and do not launch nested agents |
| hand-back target | `meta-c2d-nyx-delivery` via `c2d steer` with the `A2A:` prefix |
| meta wake | the meta arms its own wait on the implementer; the implementer reports to the meta, not to the orchestrator |

## Goal

Make `c2d` locate a Claude Code composer whose top border draws the session title, without changing
what a composer with real text does. The reported failure: `c2d steer` to an idle Claude Code 2.1.316
keeper returned `could not locate the composer; the agent may be on a dialog` because the border line
contains the title `Nyx Plane board setup` and `RULE_LINE` rejects letters.

## Allowed files

Edit only these paths. Any other change is out of scope; ask through the meta before widening.

| File | Purpose |
|---|---|
| `skills/catalyst-v2-dispatch/src/screens.mjs` | one composer-border predicate used by `extractComposer` and `liveIndicatorLines` |
| `skills/catalyst-v2-dispatch/src/deliver.mjs` | not-located specimen from the tail of the capture, claude and omp branches |
| `skills/catalyst-v2-dispatch/test/helpers/harness.mjs` | one titled-border fixture copied from the incident capture |
| `skills/catalyst-v2-dispatch/test/screens.test.mjs` | border and classification pins |
| `skills/catalyst-v2-dispatch/test/deliver.test.mjs` | claude delivery over the titled fixture, draft refusal, ghost hint, specimen tail |
| `skills/catalyst-v2-dispatch/SKILL.md` | Claude Code upgrade paragraph: capture an idle composer and check `extractComposer` |
| `.cortex/.tests/catalyst/claude-composer-title-border/test.yaml` | guard test spec |
| `.cortex/.tests/catalyst/claude-composer-title-border/scenario.md` | Mode A scenario for the upgrade check |
| `.cortex/.tests/catalyst/claude-composer-title-border/checks.mjs` | deterministic checks |
| `.cortex/.tests/catalyst/README.md` | suite row for the new slug (navigation; no check asserts it) |
| `.cortex/.tests/catalyst/lib/testspec.mjs` | parse the optional judge `distinct_by` field |
| `.cortex/.tests/catalyst/lib/resolve.mjs` | accept the same model id only under `distinct_by: isolation` |
| `.cortex/.tests/catalyst/lib/scaffold.mjs` | document the new optional field in the skeleton comments |
| `.cortex/.tests/catalyst/lib/resolve.test.mjs` | pin the default refusal and the isolation exception |
| `.cortex/.tests/catalyst/lib/testspec.test.mjs` | pin the field validation |

Do not edit the keeper, its session, model mappings, `models.yaml`, the omp delivery refusal rules, or
any Nyx project file.

## Steps

### Step 1: record the failing run first

Add the tests and the fixture before touching `src/`. Copy the composer lines from the incident's live
capture, including the 177 dash characters, the title and the single closing dash. The named pins:

- `extractComposer` on the titled empty composer returns an empty string, not null.
- `classifyScreen` on a titled composer screen with a transcript box returns `none`.
- `deliver` for claude proceeds to the send over the titled empty composer.
- A titled composer showing `half a thought the user was typing` still refuses with that draft as
  specimen.
- A titled composer showing `Press up to edit queued messages` still proceeds.
- The four existing claude fixtures keep their current extraction results.

Run the new tests against the current `src/` and save the exact output under `.tmp/`.

Expected result: the new pins fail, the failure shows `null` for the titled fixture, and the old pins
pass. A new pin that passes before the fix proves nothing; tighten it.

### Step 2: fix the border predicate

In `src/screens.mjs`, add one predicate for a composer border and use it in `extractComposer` and
`liveIndicatorLines`. A border starts with `─`, has at least 40 `─` characters, and may contain one
short title segment between runs of `─`. Keep `RULE_LINE` for the trust and dialog classification it
already serves, or replace it only where the new predicate makes the old use redundant; a transcript
rule must not become a composer border. Pair the last two composer borders and require the line after
the first to start with `❯`, as the function does now.

### Step 3: make the specimen useful

In `src/deliver.mjs`, build the not-located specimen from the last 2000 characters of the capture. The current code
slices the first 2000. Keep the specimen's role and length; do not change the refusal specimen for a
draft.

### Step 4: update the upgrade check

In `SKILL.md`, extend the Claude Code paragraph that already says an upgrade can change the trust
prompt and the composer render. After an upgrade, capture an idle composer and confirm
`extractComposer` returns an empty string, not null. Name the 2.1.316 titled border as the render
that broke the old check.

### Step 5: guard test

Create `.cortex/.tests/catalyst/claude-composer-title-border/` in the shape the suite uses
(`test.yaml`, `scenario.md`, `checks.mjs`, no history yet; the meta's replay is the first recorded
run). Pin in `test.yaml`:

- actor `opencode-go/deepseek-v4.1-flash` at thinking max
- judge `opencode-go/deepseek-v4.1-flash` at thinking max, declared but launched only by the meta's
  coordinated run; the user's DeepSeek-only restriction overrides the suite's opus judge
- judge `role: meta-agent`, because the runner takes the cli and thinking flags from the role entry in
  models.yaml while the model comes from test.yaml. The judge role in models.yaml names claude-code
  and no thinking, so it would launch flash under the wrong cli. The meta-agent role names omp with
  thinking max. Do not edit models.yaml.
- judge `distinct_by: isolation`: the shared runner's distinct-judge rule stays the default, and
  the two roles share a model id only when this field names isolation as the separation

### Step 5a: runner exception for the user's model policy

The user authorized a bounded runner change on 2026-10-31. The default refusal stays.

- `lib/testspec.mjs`: accept an optional `distinct_by` on the judge node. The only allowed value is
  `isolation`. Any other value is a spec error, so a typo cannot silently permit a same-id judge.
  Pass the field through on the normalized spec.
- `lib/resolve.mjs`: keep refusing `actorModel === judgeModel` unless the spec sets
  `judge.distinct_by === 'isolation'`. The judge still launches in its own fresh tab through c2d;
  that isolation is what separates the two contexts.
- `lib/scaffold.mjs`: add the optional field and its comment to the generated skeleton, replacing the
  "always a model distinct from the actor" comment with the default rule plus the exception.
- `lib/resolve.test.mjs`: keep the existing refusal pin. Add a run that sets
  `distinct_by: isolation` on the same collided spec and expects success, and a run with an unknown
  value that expects a spec error.
- `lib/testspec.test.mjs`: pin the accepted field, the unknown-value error, and the field's absence
  default.

Deterministic checks, behavior and context only: the unit pins named above pass in the live tool
directory, the dispatch input built from the guard spec launches both roles on `cli: omp` with
`thinking: max`, the report schema matches, and the transcript cites none of the forbidden sources.
Do not assert source text, a predicate or function name, that the harness fixture matches the
capture, or that a README row exists.

### Step 5b: Mode A scenario text

Write this text to `scenario.md` verbatim. It asks for artifacts, not a recitation, and it keeps the
actor away from this cycle's records.

```
You are a catalyst meta-agent working in the kit checkout at /etc/nixos/nix/catalyst. Do not read
anything under .cortex/ (plans, incidents, reports, memory, or this test's history). Do not run git.
Do not steer, dispatch, close, or type into any agent. Write scratch code only under
/etc/nixos/nix/catalyst/.tmp/.

A Claude Code 2.1.316 tab is idle. Its composer is empty, and Claude Code draws the generated session
title inside the composer's top border, so the line above the prompt reads
`────...──── <session title> ─` instead of a bare rule. An operator wants to send one c2d steer to
that tab.

Part A. Read the live dispatch tool source under skills/catalyst-v2-dispatch/src and
skills/catalyst-v2-dispatch/SKILL.md. Write a Node ESM program at
/etc/nixos/nix/catalyst/.tmp/titled-composer-replay.mjs that imports the live screens module by its
absolute path, builds a capture with that titled border, an empty prompt line and a status footer,
and prints the result of extractComposer as JSON. Run it.

Part B. Read the Claude Code upgrade guidance in skills/catalyst-v2-dispatch/SKILL.md and state the
check an operator runs after a Claude Code upgrade before trusting c2d delivery to a Claude tab.

Do not modify any file outside /etc/nixos/nix/catalyst/.tmp/. Answer with the program's output, the
upgrade check, and this summary block as the last thing in your reply:

SUMMARY
- skills loaded: ...
- composer result: ...
- upgrade check: ...
- files written: ...
```

The two semantic criteria: the actor reports the titled-border capture resolving to an empty composer
and does not call it a dialog, and the actor names the idle-composer capture plus an empty
`extractComposer` result as the post-upgrade check before trusting delivery. The deterministic checks
stay behavioral and contextual: the unit pins, the built dispatch inputs' `cli` and `thinking`, the
report schema, and the contamination scan. Do not assert source text, predicate or function names, a
fixture copied from the capture, or a README row.

### Step 6: gates and hand-back

Run the full dispatch suite in `skills/catalyst-v2-dispatch`:

```
node --test test/*.test.mjs
```

Expected result: every test passes, including the new pins. Record the exact pass and fail counts and
the command.

Then run the runner unit suite from `.cortex/.tests/catalyst`:

```
node --test lib/*.test.mjs
```

Expected result: the new pins pass and the only failure is the pre-existing environment pin `the
default resolves to the models.yaml beside the skill under ~/nix/catalyst/skills`. That path is absent
on this host, so the test fails before and after this change. Record the counts; the gate is no new
failure and no edit to that environment pin.

Then send the hand-back to `meta-c2d-nyx-delivery` with the `A2A:` prefix. Include:

- files changed, with a one-line reason per file
- the red run output, verbatim, and the green run output, verbatim
- the full-suite counts
- the guard test path and the checks it runs
- any deviation from this contract, and any limitation you could not remove

Leave every change uncommitted. Do not deploy, upgrade packages, or change host configuration.
