# c2d fails every claude launch: herdr 0.8.0 publishes no agent_session for claude

**Date:** 2026-08-18
**Store:** kit-level (catalyst skills)
**Owning files:** `skills/catalyst-v2-dispatch/src/launch.mjs`, `skills/catalyst-v2-dispatch/src/herdr.mjs`, `skills/catalyst-v2-dispatch/src/steer.mjs`
**Recurrence:** same startup-screen/session-wait code path as `2026-08-01-dispatch-interactive-screen-misclassification.md`; that fix is part of the story but not the cause. The regression is herdr 0.8.0, which stopped publishing `agent_session` for claude agents.

## What the user wanted

Dispatch a catalyst delegate running Claude Code (`cli: claude`, `claude-opus-4-8`) through c2d, the mandated dispatch surface. The user's words: "okay, we need to file an incident and repair so it works for claude code."

## What went wrong

Two dispatches today (`2026-08-18-link-dedup-d1`, `-d2`) failed identically at step `session_not_established`:

> no interactive screen was left to clear (startup screen: none) and the agent published no session within the session wait window

The tab came up correctly each time — right cwd, Claude Code running, `agent_status: idle`, `interactive_ready: true`, a clean prompt box — and the captured `agent get` (carried in the failure record) shows no `agent_session` field at all. Only the session gate failed; the brief was never delivered.

Same shape earlier: `curator-20260817T122410Z` and `curator-20260817T122546Z` (the Curator is `cli: claude` per `models.yaml`), plus a second-order failure in the curator steer ledger: `brief_delivery: "the agent has no session, so this delivery could be neither recorded nor attributed"`. Every successful dispatch recorded in `~/.local/state/catalyst-v2-dispatch/results/` (13 records, 2026-08-16 to 2026-08-18) used `cli: omp`.

Verified here: herdr client and server are both 0.8.0. `herdr agent get` for a live claude agent returns no `agent_session`; the omp agent on the same roster carries `agent_session: {kind: "path", source: "herdr:omp", value: <jsonl path>}`. `herdr agent start` returns none either.

## Root cause

**herdr 0.8.0 stopped publishing `agent_session` for claude agents**, and c2d hard-required it in two places:

1. `launch.mjs` step 3 (around lines 337-380): when `live.agent_session` is absent, the launch runs `recoverStartupScreen` with `isReady: sessionPublished` and then `waitForSession`, failing `session_not_established` when no session appears. A claude session never appears on herdr 0.8.0, so every claude launch burned the windows and failed. (Before 0.8.0 claude did publish — the 2026-08-01 and 2026-08-04 verification runs show claude session ids.)
2. `deliver.mjs` `deliver()`: the hard `hasSession(session)` gate refuses a delivery with no session ("could be neither recorded nor attributed"), and `steer.mjs` passed `agent_session?.value ?? null`, so the curator steer hit exactly that refusal.

The consequence is a policy the system cannot honour, not merely a tool bug: three roles in `catalyst-v2-model-picking/models.yaml` are runtime claude-code — `implementation-frontier` (claude-opus-4-8), `curator` (sonnet), `board-keeper` (sonnet) — plus `judge` and `orchestrator-claude-code`. Frontier implementation silently degraded to mid-tier deepseek; the Curator never ran via c2d on this box.

**What the session value is actually used for** (established before designing the fix): the delivery-ledger key (`ledger.mjs` `deliveryKey`/`findDelivery`/`recordDelivery`), steer attribution (`isAttributable`), the `sessionShowsSubmitted` stall proof (a file read that no-ops for claude — a claude session id is not a path), and the result document. Nothing else.

## Fix

**Option weighed and rejected:** synthesising a session id by tailing/parsing `~/.claude/projects/<slug>/*.jsonl`. That gives a real session id but reads a raw harness session file, which the catalyst-v2 bootstrap forbids as a window into a session — it would have needed a user-granted policy exception. Rejected in favour of the option that needs no exception.

**Chosen:** derive the session identity from fields herdr *does* publish — `name`, `terminal_id`, `pane_id` — as `herdr:agent:<name>:<terminal>:<pane>`. A tab create gets a fresh pane in its own terminal, so the derived key is unique per launch and stable for the agent's lifetime; it is never a file, so no raw-session read is involved. Trade-off, stated: the derived key is per-launch, not per-session-file, so an identical-text redelivery to the same agent name relaunched in the same pane would dedup-collide; pane/terminal ids are not reused in practice (d1 `w1:pT`, d2 `w1:pV`), and the mandate text includes the agent name, so the collision needs the same name, same pane, identical text — accepted.

Edits, all in `/etc/nixos/nix/catalyst/skills/catalyst-v2-dispatch/`:

- **`src/herdr.mjs`** — new `agentSession(agent)` (published record, else derived record `{agent, kind: 'derived', source: 'herdr:agent', value: 'herdr:agent:<name>:<terminal>:<pane>'}`) and `agentSessionValue(agent)`.
- **`src/launch.mjs`** — step 3 readiness is now per-CLI: omp keeps `isReady: sessionPublished` and the `waitForSession` gate exactly as before; claude gets **no early readiness exit** (`isReady: null`), so the screen poll reads until the composer appears, answering any gate it draws. After the poll, claude skips `waitForSession` (no session ever comes), re-reads `agent get`, and builds `result.session` from `agentSession(live)`; a null derivation still fails `session_not_established` — the gate is not disabled.
- **`src/steer.mjs`** — `session = agentSessionValue(info.agent)` instead of `agent_session?.value ?? null`, so a claude steer keys and attributes against the same derived identity the dispatch ledger used.
- **`test/launch.test.mjs`** — two new pins (claude launch with no `agent_session`; omp gate not weakened) plus a trust-prompt-before-composer launch case.
- **`test/steer.test.mjs`** — pin: claude steer with no `agent_session` delivers and records against the derived identity.
- **`test/helpers/harness.mjs`** — `claudeGetNoSession()` fixture.

The second iteration (composer readiness, not `interactive_ready`) came from the live probe: the first iteration exited the screen poll on `interactive_ready`, which herdr reports before the workspace trust prompt draws — the probe on an untrusted cwd failed `brief_delivery` ("could not locate the composer") with the trust prompt unanswered. `interactive_ready` is not readiness; the composer is.

## Verification

Pass criteria, written before the live runs: a real cli: claude dispatch comes up, receives its brief (composer method), hands back a wake command, and the omp path still fails a session-less launch with `session_not_established`.

- **Unit red run, recorded:** `unit-red-run.md` in the guard test dir — new pins against the unrepaired code: 16 pass / 2 fail, failing exactly as the incident does (`session_not_established` for the launch, "the agent has no session" for the steer).
- **Unit green run, recorded:** `unit-green-run.md` — full c2d suite 165/165 pass, exit 0.
- **Real launch, probe r1** (`2026-08-18-probe-claude-session`, cli: claude, claude-opus-4-8, untrusted cwd): session gate fixed (derived identity recorded), but delivery failed at the trust prompt — the recorded red for the second iteration.
- **Real launch, probe r2** (`2026-08-18-probe-claude-session-r2`, same agent): **status ok in 5.12 s.** Trust prompt read and answered; derived session `herdr:agent:probe-claude-session:term_65959a91924c819:w1:p12`; `brief_delivery: {verified: true, attempts: 1, subject_match: true, method: "composer"}`; wake command `herdr agent wait probe-claude-session --timeout 900000` handed back; status_at_return working; roster reconciliation agree true. The probe's transcript then showed the brief submitted and its reply `PROBE-OK probe-claude-session`, settling done.
- **Steer to the probe** (settled): status ok, delivery delivered, consumed true; the delivery ledger holds both the dispatch and the steer records keyed on the derived identity — attribution works.
- **Independent corroboration:** the orchestrator dispatched the Curator (`curator-20260818T221610Z`, cli: claude, sonnet) on the repaired code: status ok, derived identity `herdr:agent:the-curator:…`, composer-method delivery, wake handed back — the first successful claude dispatch since herdr 0.8.0.
- **omp unregressed:** 165/165 unit suite including the omp-gate pin; the 13 recorded omp dispatches unchanged; ledger intact (46 delivery records).
- Probe tabs closed with `herdr tab close`; the running wave (impl-link-dedup, meta-link-dedup) was not touched by this dispatch.

**Guarding test:** new `.cortex/.tests/catalyst/claude-launch-session-identity/` — deterministic criteria (unit pins, source checks, contamination scan), no Mode A intent simulation (the rule is mechanical tool code). First recorded run `history/2026-08-18-fix-live-proof` transcribes this verification; the replay is never re-run for that purpose. The runner suite's one failing test (`lib/config.test.mjs:134`, hardcoded devcontainer kit path) is pre-existing on this box (kit at `/etc/nixos/nix/catalyst`, not `~/nix/catalyst`) and unrelated to this repair.

**What remains open:** the dedup-collision trade-off above (accepted, not exercised live); the pre-existing runner `config.test.mjs` path mismatch; the transcript criteria (`actor-demonstrates`, `no-contamination`) await their first live suite run.
