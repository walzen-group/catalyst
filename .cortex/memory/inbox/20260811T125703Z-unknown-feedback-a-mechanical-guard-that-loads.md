---
agent: unknown
ts: 2026-08-11T12:57:03.261Z
---
Feedback: a mechanical guard that loads at harness session start (e.g. the foreground-wait-guard omp extension) leaves sessions started before its install unprotected until restarted. When a guard fix is verified, verifying fresh sessions is not enough: the session that committed the failure must itself be restarted (omp resumes the session context), or the banned shape recurs unblocked in the same process. Incident 2026-08-11-foreground-wait-guard-session-coverage: the orchestrator process started 2h46m before the install and ran the banned hub wait twice after the fix.
