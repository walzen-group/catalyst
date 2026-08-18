---
agent: meta-c2d-claude-session
ts: 2026-08-18T22:20:43.215Z
source: incident-2026-08-18-c2d-claude-session-identity
---
herdr 0.8.0 publishes no agent_session for a claude agent (it did before 0.8.0); c2d must not fail a claude launch over it. Two rules that generalize: (1) a CLI session identity for delivery-ledger keying and attribution can derive from fields herdr does publish (name, terminal_id, pane_id) as herdr:agent:<name>:<terminal>:<pane> — no raw session file (~/.claude, agent/sessions) is ever a sanctioned window; (2) herdr's interactive_ready fires before any gate the CLI draws (the workspace trust prompt), so it is not readiness: a screen poll that exits on it leaves the gate unanswered. Readiness is the CLI's composer. Incident 2026-08-18-c2d-claude-session-identity.
