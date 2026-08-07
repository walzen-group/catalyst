# c2d steer answer-keys fails to answer a pending question and never delivers the directive

**Status:** resolved 2026-08-03: feature verified working, then removed by user decision; steer now detects a blocked agent and returns a herdr hint. The fix prescription below is superseded (see Resolution).
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills).
**Owning files:** `settings/skills/catalyst-v2-dispatch/src/steer.mjs` (answer-keys handling), `settings/skills/catalyst-v2-dispatch/SKILL.md` usage text, and the `--answer-keys` option line in `src/cli.mjs` USAGE.
**Cross-reference:** `2026-08-02-quickchat-forward-without-context.md`, the chat layer relayed this tool failure to the orchestrator without the conversational context the directive needed.

## Resolution (2026-08-03): feature removed

The answer-keys approach was verified working on 2026-08-02, then removed. steer no longer answers a pending question itself: it detects the block and returns `{ status: 'blocked', question, hint }` with a herdr hint, sends no keys, and delivers no directive. The caller resolves the question through herdr, one key at a time, and re-runs steer to deliver the directive once the agent is working or idle.

Reasons for removal:

- Batched keys leave a multi-stage AskUserQuestion dialog stuck on stage 1: the first enter selects the option, the keys behind it never reach the next stage.
- A live question can need a key sequence a flag cannot express; the free-text option is select-then-type, which needs a beat between the select and the typed text.
- An omp agent blocks only via its own ask tool, so herdr is the party that owns the answer; steer typing into the dialog reimplements herdr's job from outside.

What changed: `--answer-keys` is gone from the `src/cli.mjs` USAGE and option spec (`c2d steer --answer-keys 1 --text x` now errors `--answer-keys: unknown option`), the answer-keys path in `src/steer.mjs` is replaced by the detect-and-hint block (`herdr agent read`, `herdr agent send-keys` one key at a time, `herdr agent attach`, then re-steer), and the SKILL.md usage text no longer documents the flag. `test/steer.test.mjs` anchors the new contract with a regression test: a blocked agent is reported with a herdr hint, with nothing sent. The flag survives only in comments that point back to this incident.

## What the user wanted

`c2d steer --agent orchestrator --answer-keys 1,ENTER --text "keep steer file"`: answer the orchestrator's pending question with the keys and deliver the directive, in one steer.

## What went wrong

| Attempt | Result |
|---|---|
| `--answer-keys 1,ENTER --text keep steer file` | herdr rejected the keys: `invalid_key unsupported key 1,ENTER`; steer reported step `answer_keys` failed. |
| `--answer-keys 1 ENTER --text keep steer file` | send-keys itself succeeded with no failure entry, but the result still reported `status: blocked`, `text_delivered: null`, and the question still pending. |
| `herdr agent send-keys orchestrator 1 ENTER` (direct shell call) | resolved the pending question; the orchestrator returned to working. |

The steer answer-keys path never delivered the text in either attempt. The usage text documents `--answer-keys <keys>` with no separator format, and `src/steer.mjs` splits the value on whitespace only: `1,ENTER` becomes the single key `1,ENTER` (which herdr rejects), and the space-separated form, even though its send-keys call succeeded, still came back `blocked` at the steer's immediate re-read, so steer returned `blocked` with the directive undelivered.

## Root cause

Two gaps in the answer-keys path of `steer.mjs`:

1. **Undocumented, whitespace-only key parsing.** `String(answerKeys).split(/\s+/).filter(Boolean)` turns `1,ENTER` into one herdr key named `1,ENTER`, which herdr rejects as `invalid_key`. Nothing in `SKILL.md` or the `cli.mjs` USAGE says how keys separate, so a comma form is a natural guess the tool cannot accept.

2. **The answer and the directive never compose.** The flow sends the keys, re-reads the agent exactly once, and if the agent still reports `blocked` at that instant, returns `{ status: 'blocked', question: ... }` with `text_delivered: null`. There is no settle window for the answer to take effect and no delivery of `--text` after the keys. The second attempt hit exactly this: send-keys succeeded, the immediate re-read still saw `blocked` (the orchestrator needs a beat to process the key), and the steer bailed, dropping the directive. The direct shell call worked because it sent the same keys and the caller waited for the agent to process. A caller who combines `--answer-keys` with `--text` asks for one operation: answer the question, then deliver the directive. The tool delivers neither reliably.

The answer-keys path has no test coverage: `test/steer.test.mjs` has no case that exercises it, and `test/helpers/fake-herdr.mjs` cannot model an agent that leaves the blocked state after a key, so the gap shipped silent.

## Fix (superseded: feature removed, see Resolution)

Code and doc. **Fix-in-progress, specified here for a follow-up worker; this dispatch does not write product code.**

In `settings/skills/catalyst-v2-dispatch/src/steer.mjs`:

1. Accept a key separator: split `answerKeys` on whitespace and commas (`String(answerKeys).split(/[\s,]+/).filter(Boolean)`) so `1,ENTER` and `1 ENTER` are equivalent.
2. After send-keys, settle instead of one-shot re-read: loop the `agent get` plus screen read with a short bounded window (the tool already has `sleep` in `timing.mjs` and the `CATALYST_DISPATCH_SCREEN_INTERVAL_MS` env convention) until the agent leaves `blocked`/trust or the window expires.
3. When the answer resolves the question, continue the normal steer flow: composer check, deliver `--text`, confirm consumption, and return a non-blocked status with `text_delivered` set. Only when the window expires with the agent still blocked return `{ status: 'blocked', question }` with `text_delivered: null` (the directive must not be typed into a live dialog).

In `settings/skills/catalyst-v2-dispatch/SKILL.md` and `src/cli.mjs` USAGE: document the `--answer-keys` key format, key names separated by spaces or commas (`1 ENTER`, `1,ENTER`).

Test seam work the follow-up worker needs: `test/helpers/fake-herdr.mjs` must be able to flip `agent get` from `blocked` to a working status once Enter is sent (extend it like the existing `readsAfterEnter` switch, for example `agentGetAfterEnter`). The Enter detection must be case-insensitive: herdr keys are uppercase `ENTER` and the fake currently matches lowercase `enter`.

## Verification owed (superseded: feature removed, see Resolution)

A `test/steer.test.mjs` case through the fake-herdr seam: rig an agent whose `agent get` reports `blocked` and whose state flips to working after Enter; call `steerAgent` with `answerKeys: '1,ENTER'` and a text directive; assert the send-keys call received `1` and `ENTER` as separate argv entries, the directive was delivered after the answer, the result status is non-blocked (ok), and `text_delivered` holds the directive. Then run the unit suite (`node --test` in `settings/skills/catalyst-v2-dispatch/`) and confirm no regression. The fix counts as done only when that case passes against the new code and fails against the current one.

## Related

- `2026-08-01-dispatch-steer-reported-failure-after-delivery.md` and `2026-08-01-omp-delivery-raw-paste.md`: the delivery-truth family. Different path (`deliver.mjs`), same class of caller-facing lie: a steer that reports one thing and did another. This incident is the first filing for the blocked-agent answer path.
