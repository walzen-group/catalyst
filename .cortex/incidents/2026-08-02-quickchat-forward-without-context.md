# Quickchat forwarded a directive without the conversational context the orchestrator needed

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills).
**Owning file:** `settings/skills/catalyst-v2-quickchat/SKILL.md`, RELAY section and NEVER list.
**Cross-reference:** `2026-08-02-c2d-steer-answer-keys-broken.md`, the tool failure the chat layer relayed is that incident's answer-keys defect.

## Answer first

The chat layer forwarded a tool-failure directive to the orchestrator as a bare quote, without the conversational context that made it actionable, and the user flagged it: "you cant just send this to the orchestrator without adding the context". The user then set the rule: forward the meaning verbatim, may attach context from the conversation, never re-explain the message. The RELAY section's "NOTHING else" wording from the editorial-framing repair over-corrected, stripping context along with interpretation.

## What the user wanted

Verbatim: "we need to adjust the directive as well for quickchat, you should forward my meaning verbatim, but you may attach context from our conversation (but not re-explain my message); and this is an incident twoo btw."

So: a forward keeps the user's words verbatim, carries the conversational context the message depends on, and never re-explains or rewrites the user's own message.

## What went wrong

The chat layer forwarded the user's report of the answer-keys tool failure to the orchestrator with the user's words alone. The report referenced a specific failing command and outcome; without the surrounding conversation (which steer had failed, with what herdr error, what the user had already tried), the orchestrator could not act on it. The user had to intervene with the verbatim correction above.

## Root cause

The RELAY section's forwarding rule over-corrected after `2026-08-02-quickchat-editorial-framing-on-forward.md`. That incident banned the chat layer's own interpretation of the user's intent, and its repair added: "A forward carries the user's words and NOTHING else, unless the user explicitly asked you to add context from the chat layer." Read literally, "NOTHING else" forbids all added content, including factual conversation context the orchestrator needs. The chat layer runs opencode-go/deepseek-v4-flash, a small model that follows the instruction block closely, so it stripped the context along with the interpretation and forwarded the bare quote. The editorial-framing ban targeted gloss on the user's intent; the repair's wording banned context wholesale. The earlier fix was too weak in one direction (framing slipped through) and its replacement too strong in the other (context stripped out). The over-correction is the root cause; the earlier incident is the predecessor.

## Fix

`settings/skills/catalyst-v2-quickchat/SKILL.md`, made in this dispatch:

- RELAY, forwarding bullet: "A forward carries the user's words and NOTHING else, unless the user explicitly asked you to add context" replaced with: the quote is the user's words verbatim; attach the context from the conversation that the message depends on (what failed, what came before), so the orchestrator can act on the quote alone; the context sits apart from the quote under its own marker and never rewrites it; do not re-explain or reword the user's own message, and no reading of the user's intent goes in the forward.
- NEVER list: the framing ban keeps its shape; "the body is the verbatim quote and nothing else" becomes "the body is the verbatim quote; context from the conversation attaches apart from it, never as a rewrite or re-explanation."

## Verification

Mode A intent simulation, per `catalyst-v2-running-a-meta-agent`. Replay agents dispatched through c2d, inline on stdin, background, cwd /workspaces/nix, cli omp, model opencode-go/deepseek-v4-flash at thinking max (the chat layer's standing model). Isolation: the probe allowed reading only the live skill at /opt/skills/catalyst-v2-quickchat/SKILL.md; .cortex, git, and any other file were out of bounds; the probe never mentioned any change. Artifact asked: the exact message the chat layer sends to the orchestrator, in a scenario baited both ways (the directive is unintelligible without conversation context, and the orchestrator explicitly asked for it).

Pass criteria, fixed before reading output: the user's directive appears verbatim and whole; the message attaches the conversational context the orchestrator needs, marked apart from the quote; no re-explanation or reword of the user's message, no "the user expects"/"this answers your follow-ups" gloss; a neutral routing line.

**Run 1 (replay-relay-context, tab w1:tS): FAIL.** The forward was the user's words verbatim under "Steering update:" with no gloss, but carried no context despite the orchestrator's explicit request. The "You MAY attach context" wording read as optional and the model forwarded bare. Not contamination (the agent read only the skill); a behavior miss, sent back to the repair. The rule was tightened: "You MAY attach context" became "Attach the context from the conversation that the message depends on, so the orchestrator can act on the quote alone."

**Run 2 (replay-relay-context-2, tab w1:tT): PASS, after the tightening.** The agent read only the live skill and produced: routing line "Steering update:", body "the answer-keys flag needs a comma separator, and the steer file stays until the fix lands" (the user's words verbatim, no qualifier dropped), and an attached context block naming the failing command, the herdr `invalid_key` error, and the failed step. No re-explanation of the user's message, no gloss on intent. All four criteria met. The agent additionally performed the steer rather than only showing the message (the probe said "send"), so the orchestrator's session received the probe directive; the hand-back restates the same substance as the authoritative version. Both replay tabs closed after.

The user's directive said "you may attach context", which reads as permission; the incident's demand ("you cant just send this to the orchestrator without adding the context") is a duty. The repaired rule states the duty: context the message depends on attaches by default, interpretation never does.

## Related

- `2026-08-02-quickchat-editorial-framing-on-forward.md`: the predecessor; its "NOTHING else" wording is the over-correction this repair refines.
- `2026-08-02-c2d-steer-answer-keys-broken.md`: the tool failure the context-less forward reported.
