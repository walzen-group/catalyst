# Run 2026-08-18-fix-live-proof - raw LLM output

- Side: declared
- Actor model: opencode-go/deepseek-v4-flash
- Actor harness: omp
- Judge model: claude-opus-4-8

## Actor output

TRANSCRIBED FIRST RUN. The fix dispatch (2026-08-18-c2d-claude-session-repair)
verified the repaired c2d launch behavior with real herdr launches. The
session output is on the record in the dispatch result documents under
$XDG_STATE_HOME/catalyst-v2-dispatch/results/; this log transcribes the
evidence:

1. Probe dispatch r1 (2026-08-18-probe-claude-session), cli: claude,
   claude-opus-4-8, untrusted cwd /tmp/probe-c2d-claude, on the first fix
   iteration: the session gate was fixed (derived identity
   herdr:agent:probe-claude-session:term_65959a00a335c17:w1:p0 recorded, no
   session_not_established) but delivery failed: 'could not locate the
   composer' - the readiness exit on interactive_ready had fired before the
   workspace trust prompt drew, so the gate was never answered. That run is
   the recorded red evidence for the trust-before-composer interaction.

2. Probe dispatch r2 (2026-08-18-probe-claude-session-r2), same agent, on
   the second iteration (claude readiness = the composer itself): status ok
   in 5.12 s. The trust prompt was read and answered with Enter; the derived
   session identity herdr:agent:probe-claude-session:term_65959a91924c819:w1:p12
   was recorded; brief_delivery verified true, attempts 1, subject_match
   true, method composer; the settle wake command
   'herdr agent wait probe-claude-session --timeout 900000' was handed back;
   status_at_return working; roster reconciliation agree true. The probe's
   own transcript then showed the brief submitted and its reply 'PROBE-OK
   probe-claude-session', settling done.

3. Steer to the probe (probe settled): status ok, delivery delivered,
   consumed true. The delivery ledger holds both records keyed on the
   derived identity (dispatch + steer), so attribution works.

4. Independent corroboration: the orchestrator dispatched the Curator
   (curator-20260818T221610Z, cli: claude, sonnet) on the repaired code and
   it launched status ok: derived identity
   herdr:agent:the-curator:term_65959a24e6ed118:w1:p11, brief_delivery
   verified true method composer, wake handed back, status_at_return
   working - the first successful claude dispatch since herdr 0.8.0.

5. omp path: the c2d unit suite runs 165/165 with the omp gate pin
   (a session-less omp launch still fails session_not_established) and the
   delivery ledger keeps the 13 successful omp dispatches (2026-08-16 to
   2026-08-18) unchanged.

Unit-suite red run recorded at unit-red-run.md (launch+steer, 16 pass / 2
fail: session_not_established for the claude launch, 'the agent has no
session' for the steer); green run at unit-green-run.md (165/165).

## Judge output

(no judge run: no semantic criteria)
