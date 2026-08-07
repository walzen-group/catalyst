# c2d status read a running worker as a meta and reported healthy

**Status:** filed; fix is code, fix-in-progress (worker task follows).
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills).
**Owning file:** `settings/skills/catalyst-v2-dispatch/src/status.mjs` (`roleFor`, and by extension `classify`).

## Answer first

During dispatch wave 2026-08-02-metaenforce-w1, `c2d status` classified the running worker `impl-kind-preflight` as role `meta` and reported `classification: healthy` with reason `no worker is in flight`. The worker's brief contained the words "Hand back a diff", which `roleFor`'s brief-text regex read as a meta signal. The roster read therefore masked an in-flight worker with no meta watching it, the exact failure mode the worker-needs-meta enforcement exists to prevent.

## What the user wanted

A health read that tells the truth about the roster: a running worker with no meta is `UNWATCHED`, never healthy.

## What went wrong

1. Wave 2026-08-02-metaenforce-w1 ran the worker `impl-kind-preflight`, which was implementing task-1 of the dispatch-meta-enforcement plan.
2. A `c2d status` read on that wave classified `impl-kind-preflight` as role `meta`.
3. `classify` then saw zero workers in flight (`workersInFlight.length === 0`) and returned `{ classification: 'healthy', reason: 'no worker is in flight' }` while the worker was actively running.
4. A false healthy is the worst form of the unwatched state: the read actively reports the roster is fine, so nothing downstream signals that the worker-needs-meta condition applies.

## Root cause

`roleFor(name, recordedAgent)` in status.mjs decides role from two signals:

- The `meta-`/`meta_` name prefix. Reliable: every meta is named `meta-*` by convention.
- A brief-text regex against the recorded `brief_text_delivered`: `META_BRIEF = /\bmeta[- ]agent\b|hand[- ]?back|monitor\b/i`.

Brief text is user-authored prose, not a role signal. Worker briefs legitimately contain "hand back" (this one said "Hand back a diff"), "monitor", and "meta-agent". The regex matched `hand[- ]?back` and the worker was read as a meta. The second branch of `roleFor` is a false-positive machine with a real worker's brief as its input.

## Fix (code, in progress)

`roleFor` determines a meta by the name prefix only, dropping the brief-text branch and the `META_BRIEF` constant. This matches the correction already applied to `src/preflight.mjs` in task-1 of the dispatch-meta-enforcement plan, which detects metas by name prefix only for the same reason (header comment, lines 17-23).

Precise worker spec:

1. `settings/skills/catalyst-v2-dispatch/src/status.mjs`:
   - Delete the `META_BRIEF` constant (line 26).
   - `roleFor` returns `'meta'` when the name starts with `meta-`/`meta_`, else `'worker'`. Remove the `recordedAgent` parameter and the brief branch; update the single call site in `readStatus` (line 222) to `roleFor(name)`.
   - Update the function doc comment: the recorded brief is no longer a role signal; the name prefix is the convention and the only signal.
2. `settings/skills/catalyst-v2-dispatch/src/preflight.mjs`: update the header comment (lines 17-23). It currently justifies a deliberate divergence ("status.mjs roleFor also treats a monitoring/hand-back brief as a meta signal; this gate deliberately diverges"). After this fix both sides are name-prefix-only, so rewrite the comment to record the shared rule: meta detection is name-prefix only, because a worker brief can legitimately contain "hand back" (observed live 2026-08-02 on `impl-kind-preflight`).
3. New `settings/skills/catalyst-v2-dispatch/test/status.test.mjs` (none exists today; follow the conventions of test/preflight.test.mjs: `node:test` plus `node:assert/strict`, direct import of `roleFor` and `classify` from `../src/status.mjs`):
   - `roleFor('impl-kind-preflight', { brief_text_delivered: 'Hand back a diff' })` returns `'worker'`.
   - `roleFor('meta-watch')` returns `'meta'`; `roleFor('impl-x')` returns `'worker'`.
   - A classify-level regression: an in-flight agent named `impl-kind-preflight` with no meta on the roster classifies `UNWATCHED`, never healthy.

## Verification owed (once the code lands)

- `cd settings/skills/catalyst-v2-dispatch && node --test test/*.test.mjs`: all pass, including the new status.test.mjs and the existing preflight regression case (a non-meta partner with a monitoring brief does not satisfy the meta requirement).
- The new status test binds: run it against the pre-fix `roleFor` (brief branch restored) and the "hand back" case must fail.
- Optional live replay: dispatch a worker whose brief contains "Hand back a diff" with a meta present, then `c2d status` reads the worker as a worker, and the roster as `UNWATCHED` if the meta is gone.

## Orchestrator context

The misclassification was observed live during wave 2026-08-02-metaenforce-w1. The orchestrator applied the name-prefix-only correction to preflight.mjs as a mid-flight fix to task-1 (plan revision notes) but deliberately deferred the equivalent fix to `status.mjs` `roleFor`, leaving the status tool still misclassifying. The user then flagged that the tool not working is itself an incident. The plan index's out-of-scope note ("Changing meta detection heuristics ... reused as-is") is superseded for status.mjs by this incident.

## Recurrence

None. No prior incident records the `roleFor` brief-sniff misclassification; this is the first filing for this shape.

## Related

- `2026-08-02-quickchat-dispatched-worker-no-meta.md`: the enforcement effort this defect undermines. Its fix (`kind` field, roster-aware worker-needs-meta preflight refusal) is tracked in `.cortex/plans/2026-08-02-dispatch-meta-enforcement/`; task-1 landed the preflight half with the name-prefix-only correction, this incident covers the status half that was left misclassifying.
- `2026-08-01-dispatch-interactive-screen-misclassification.md`: prior misclassification defect in the same tool (screen classification). Different surface, same lesson: heuristics over live output need a reliable convention underneath.
