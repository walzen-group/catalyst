# c2d steer cannot find a Claude Code composer whose top border draws the session title

**Date:** 2026-10-31
**Store:** kit-level (catalyst system); the coordination damage lands in the Nyx wave.
**Status:** accepted after independent evidence audit on 2026-10-31; coordinator-owned commit pending.
**Owning files:** `skills/catalyst-v2-dispatch/src/screens.mjs` (composer border predicate),
`skills/catalyst-v2-dispatch/src/deliver.mjs` (not-located specimen),
`skills/catalyst-v2-dispatch/SKILL.md` (post-upgrade check), and the dispatch tool's test suite
with a guarding test under `.cortex/.tests/catalyst/`.

**Recurrence:** a scan of `.cortex/incidents/` and `.cortex/.tests/catalyst/` found four reports that
name the same failure string for other causes:

- `2026-08-01-dispatch-multiline-prompt-parked-paste.md`: the claude pre-send composer read ran once,
  before the CLI had redrawn its prompt. The fix added the polling read (`waitForComposer`).
- `2026-08-18-c2d-claude-session-identity.md`: a trust prompt still covered the composer when the
  read ran, so the same string reported the unanswered gate. The fix made the composer the readiness
  signal.
- `2026-08-13-steer-composer-bar-misread-meta-unreachable.md`: the omp status-box bar was absent on a
  settled screen. That report covers `ompComposerText`; this failure runs through `extractComposer`.
- `2026-10-28-c2d-omp-hint-and-startup-gate.md`: the last Claude Code render change answered a
  2.1.312 trust prompt whose cursor sat on `No, exit`. It did not exercise an idle composer.

None of the four names a composer block drawn with a title in its border. This report covers a new
render from Claude Code 2.1.316 installed today at 11:54, so it is not a recurrence of an earlier fix.

## What the user wanted

The Nyx migration request needed Plane lifecycle dates on started and finished tasks. The
orchestrator sends those updates with `c2d steer` to the authenticated `nyx-planekeeper` Claude Code
session. The expected behavior: c2d reads the keeper's current composer, finds it empty, and delivers
one attributable message. A genuine draft, an unreadable composer or a dialog stays protected. Moving
the keeper's pane must not change targeting.

## What went wrong

Three steers to `nyx-planekeeper` failed on 2026-10-31, each returning `status: failed`,
`attempts: 0`, `text_delivered: null`, and the reason `could not locate the composer; the agent may be
on a dialog`. The failure ledger at `~/.local/state/catalyst-v2-dispatch/failures/nyx-planekeeper.json`
records them at 15:01:08.461Z, 15:08:29.265Z and 15:13:46.497Z. Nothing was sent on any attempt.

The keeper was idle in its expected session (`0411d547-4c0d-451a-bc47-4927cbe8ee23`) with an empty
composer and a Haiku 5.5 status footer. `herdr agent get` resolved the agent. The user moved the
keeper from w11:pB to w13:p4; the session stayed the same and the next c2d attempt failed the same
way. A native herdr prompt, approved by the user as a temporary route, delivered and the keeper
completed the requested Plane update. The visible capture of the keeper's screen at diagnosis shows
the composer plainly:

```
...older conversation...
────────────────────────────── Nyx Plane board setup ─
❯
─────────────────────────────────────────────────────────────
  Haiku 5.5 | [██████████░░░░░░] 607k/1.0M (61%) | ...
```

The line directly above `❯` is the composer's top border. It has 177 `─` characters, 5 spaces and the
18 letters of `Nyx Plane board setup`, for 200 cells. Claude Code draws the session title inside that
border; the terminal title herdr publishes for the pane is the same string.

`extractComposer` in `src/screens.mjs` defines a rule line as
`/^[^\p{L}\p{N}|]*─[^\p{L}\p{N}|]*$/u`, which rejects any line that contains a letter. The titled
border is not counted as a rule, so the function pairs the composer's bottom border with the `╰`
border of a transcript box further up the screen, finds no `❯` line after that pairing, and returns
null. Eight consecutive `herdr agent read --source visible` captures gave the same titled border, and
a direct call to `extractComposer` on a saved capture returned null.

The failure's `specimen` made diagnosis harder. `deliver.mjs` builds it as
`collapse(raw).slice(0, 2000)`, the first 2000 characters of the capture, which are old conversation
from the top of the visible screen. The composer sits in the last lines, so the specimen showed
board-population text from a previous turn. The reason text, `may be on a dialog`, states a
hypothesis; the tool had no evidence of a dialog.

Five earlier steers to the same keeper failed at the read step between 14:09 and 14:43 with
`agent read failed: herdr exited non-zero: status 1`. A steer at 14:43:00.711Z did deliver after those
failures. Those read failures come from a different step and remain an open item below; they are not
this composer defect.

## Root cause

Claude Code 2.1.316 draws the auto-generated session title inside the composer's top border. The
dispatch tool recognizes a composer border only when the line contains no letters or digits, so the
titled border is invisible to it. The extractor then pairs the bottom border with an unrelated rule
and reports that no composer exists. The delivery sends nothing and records an empty attempt count, and the
user sees a failure that blames a dialog.

Two smaller gaps increased the time to diagnosis. The not-located specimen prints the head of the
screen, where the composer is not; a tail excerpt would have shown the titled border immediately. The
tool's own upgrade guidance in `catalyst-v2-dispatch/SKILL.md` tells an agent to re-capture a gated
startup screen after a Claude Code upgrade and check `TRUST_MARKERS` and `trustAnswerKeys`. It says
nothing about capturing an idle composer, although the same paragraph mentions that upgrades can
change the composer render. The next render change can therefore break delivery silently in the same
way.

### Assumptions

| # | Assumption | Basis | Check that would confirm it |
|---|---|---|---|
| A1 | The title border is drawn once Claude Code has generated a session title, not at tab start | Deliveries to session 0411d547 succeeded at 13:55, 14:00, 14:03, 14:05 and 14:43 on 2.1.316; the same session fails now with a stable titled border | Start a claude tab on 2.1.316 and capture its composer before the first turn and after a title is generated |

## Impact

The orchestration channel to the Claude keeper was unusable for normal c2d traffic. Three attempts
over twelve minutes failed, and the coordinator fell back to native herdr prompts, which the user
allowed only as a temporary route. Any future dispatch or steer to a Claude Code 2.1.316 tab whose
session title is drawn is exposed, including the tool's own composer-based landing verification in
`launch.mjs`. The failure reason and specimen point at a dialog and at old conversation, so the next
agent gets no signal that the composer render changed.

## Fix

Repair in progress; the implementer applies it in a separate dispatch and imports nothing from this
cycle beyond this report. All work stays uncommitted.

1. `src/screens.mjs`: replace the two-place border test with one predicate for a composer border. A
   border starts with `─`, has at least 40 `─` characters, and may contain one short title segment
   between runs of `─`. Use it for the border pair in `extractComposer` and for the block search in
   `liveIndicatorLines`, so the status reader agrees with the delivery reader. `classifyScreen` then
   stops treating a titled composer screen as a question because of transcript boxes.
2. `src/deliver.mjs`: build the not-located specimen from the tail of the capture, where the composer
   draws. Apply the same helper to the claude pre-send and post-stall not-located failures and to the
   omp bar-less failure.
3. Tests, written first: add the live capture from this report as a titled-border fixture, and pin
   that a titled empty composer resolves to an empty string (located), that a titled composer with
   foreign draft still refuses with the draft as specimen, that a titled composer showing the queued
   hint still proceeds, that `classifyScreen` reads such a screen as `none`, and that a claude
   delivery proceeds over the titled empty composer. Record the failing run against the current code
   before the fix and the passing run after it. The four existing claude fixtures must keep their
   current extraction results.
4. `SKILL.md`: extend the Claude Code upgrade paragraph. After an upgrade, capture an idle composer
   and confirm `extractComposer` returns an empty string, not null, before trusting c2d delivery to a
   Claude tab. Name the 2.1.316 titled border as the render that broke the old check.
5. Guard test `.cortex/.tests/catalyst/claude-composer-title-border/`: deterministic checks for the
   unit pins, the dispatch inputs' `cli` and `thinking`, the report schema and the contamination
   scan, plus a Mode A scenario for the upgrade check. Checks stay behavioral and contextual: no
   source-text, predicate-name, fixture-copy or README-presence assertion, per the coordinator on
   2026-10-31. The run's history is the first recorded run.
6. Shared runner, authorized by the user on 2026-10-31 after this report named the conflict:
   `lib/testspec.mjs` accepts an optional judge `distinct_by: isolation` field, and
   `lib/resolve.mjs` allows a judge model id equal to the actor's only when that field names
   isolation. The default refusal stays. `lib/scaffold.mjs` documents the field, and the runner unit
   tests pin the refusal, the exception and an unknown-value error. The user's DeepSeek-only model
   policy applies to every launch; the runner's opus judge mapping stays untouched.

Dispatch record: the single implementer launched at 15:37:29 as `impl-c2d-composer` under dispatch
`2026-10-31-c2d-composer-implementation`, on the default `kind: worker`, with this report's path named
in its brief. The `kind: repair` plus `incident_path` detail came after launch, so
c2d's preflight repair check did not run mechanically. The report exists and the brief names it, so
the repair criterion was met in substance; the deviation is metadata, recorded here on 2026-10-31. No
second implementer was launched.

Not in scope: the composer refusal rules, the omp delivery path beyond the shared specimen helper, the
keeper's configuration or model, global model mappings, commits, deployment, and any special case for
`nyx-planekeeper`.

## Verification

Owner: meta-c2d-nyx-delivery, the meta-agent of this cycle. Criteria, fixed before the run:

1. The implementer records the red run of the new tests against the unrepaired code and the failure
   matches the reported behavior. A green run without that red run does not confirm the fix.
2. The full dispatch suite passes in the installed tool directory.
3. A protected foreign draft in a titled composer stays byte-identical after a refused delivery; the
   refusal returns the draft as specimen and sends nothing.
4. The independent whole-change read finds the source edits limited to the two files above plus the
   instruction paragraph, with no unrelated kit or Nyx change, and every changed line tied to this
   report.
5. Mode A intent replay with fresh contexts: actor `opencode-go/deepseek-v4.1-flash` at thinking max,
   judge `opencode-go/deepseek-v4.1-flash` at thinking max in a separate isolated context. The user's
   DeepSeek-only restriction overrides the shared runner's role mapping. Conflicts recorded:
   `models.yaml` and the runner's tests declare the judge as `claude-opus-5-5`; this run must not
   launch that model. The runner's distinct-judge rule refused the same model id by code, and the
   user authorized the bounded runner exception in Fix item 6. The guard test declares
   `distinct_by: isolation`, so the runner launches both roles on flash max in separate tabs. The
   judge node names `role: meta-agent` because the runner reads the cli and thinking flags from the
   role entry in models.yaml; naming the judge role would launch flash under claude-code with no
   thinking. Escalate again if the run is refused for any other reason. The replay reads live
   instructions only and must not open this report or the test history.
6. Live delivery smoke after the fix, coordinated with the orchestrator: read the keeper's composer
   and confirm it is empty, confirm the session id is `0411d547-4c0d-451a-bc47-4927cbe8ee23`, send
   one harmless status or readback request through `c2d steer`, and confirm one attributable delivery
   with no Plane write. The native route already proved the keeper reachable; this cycle does not
   repeat failed notifications as confirmation of the defect.

### Recorded results

- Implementer red runs: dispatch pins 75 tests, 67 pass, 8 fail; runner pins 28 tests, 26 pass,
  2 fail. Green: focused dispatch 75/75, focused runner 32/32, full dispatch 223/223, full runner
  128 tests with 127 pass and the known `~/nix/catalyst` path pin. The meta re-ran both full
  suites and read the red logs; counts match.
- Independent live check: the keeper's captured screen through the fixed extractor yields an empty
  composer and classifies as none. A titled composer with a real draft still refuses with the
  draft as specimen, the probe restores the character, and nothing is sent.
- Keeper smoke: preflight idle, session `0411d547-4c0d-451a-bc47-4927cbe8ee23`, empty composer under
  the titled border; one steer returned `delivery.status: delivered`, attempts 1, exact text; the
  keeper replied with its status and last completed task and reported no Plane or board change.
  The post-send read failed with `agent read: herdr exited non-zero: status 1`, a read observation
  separate from the delivery. Zero board writes.
- Mode A: the first run, `2026-10-31T15-49-47`, records both semantic criteria as pass with judge reasoning and `errored: false`. Its original result is 5/6 because the old contamination scan matched the incident slug cited from live SKILL.md.
- Independent audit: `.cortex/reports/2026-10-31-c2d-evidence-audit.md` re-evaluated the preserved first run with the corrected checks. That material satisfies all six current criteria. Every original history keeps its recorded result.
- Runs 2 through 9 retain their errored or invalid outcomes. The earlier claim that semantic verdicts were absent in all nine runs was incorrect for run 1.
- The six experimental capture/judge files remain reverted. Their proposed correction is unapproved and unnecessary for acceptance of this composer repair.
- Coordinator guard cleanup removed assertions on test-description wording. The actual focused behavior suite then ran through `unitPinsPass` and returned `75 tests, 75 pass, 0 fail`. The guard still requires every focused behavior test to pass.

The composer repair is accepted on the recorded red/green gates, live capture, protected-draft behavior, single keeper delivery and the independently audited Mode A evidence.

## Open items

- The `agent read failed: herdr exited non-zero: status 1` entries are undiagnosed. Five fired
  between 14:09 and 14:43, and the same failure hit the post-send read of the 15:54 smoke after the
  delivery had succeeded and the keeper had answered. It affects reads, not delivery, and needs its
  own evidence.
- The failure ledger still records step, detail and time, with no specimen (open item in the
  2026-08-13 report). This repair improves the specimen returned to the caller only.
- A1 stays an assumption until a fresh Claude tab is captured before and after Claude Code draws its title.
- At 15:37 on 2026-10-31 the keeper's composer showed `1` under a Claude feedback survey; no tool
  action in this cycle typed into it. The text cleared before the 15:54 smoke, which then ran from an
  empty composer.
