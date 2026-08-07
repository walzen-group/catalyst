# Quickchat added editorial framing when relaying user messages to the orchestrator

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills).
**Owning file:** `settings/skills/catalyst-v2-quickchat/SKILL.md`, RELAY block and NEVER list.

## Answer first

The chat layer relayed user messages to the orchestrator with its own editorial framing added: glosses such as "the user expects X" or "this answers your follow-ups", instead of forwarding the user's words alone under a neutral routing line. The quickchat skill required verbatim forwarding and banned attaching research or a note, but its verbatim rule guarded against changing or adding to the user's words, not against wrapping them in the chat layer's own reading of what the user means or wants. Recurrence of `2026-08-01-quickchat-unsolicited-research-notes.md`, the same family (the chat layer adds its own voice to a forward); the prior fix banned attached research, note, and proposal, and left interpretive framing of the user's intent uncovered. The repair names that shape and bans it.

## What the user wanted

Verbatim: "also, another incident: you (quickchat) started adding your own messaging when relaying to the orchestrator with the user expects. I tell the orchestrator, and that is also something that should be forbidden in the quickchat skill if I am not mistaken."

So: a forward carries the user's words alone, with no framing that characterizes what the user means, wants, or expects. `catalyst-v2-quickchat` requires verbatim forwarding; `catalyst-v2-orchestrating-delegates` states attribution is quoted and never inferred.

## What went wrong

The chat layer forwarded user traffic to the orchestrator with interpretive framing around the quote: phrases like "the user expects X" and "this answers your follow-ups". That framing is the chat layer's own reading of the user's intent, presented on the one channel whose contract is verbatim fidelity. The user asked for none of it.

## Root cause

The verbatim rule covered the words, not the frame around them.

- **RELAY** already said a forward "carries the user's words and NOTHING else, unless the user explicitly asked you to add context." A reader could satisfy that by keeping the user's words exact and still add a gloss about what the user means, reading "nothing else" as "no separate content" rather than "no interpretation."
- **NEVER** banned attaching "your own research, note, or proposal" and presenting "anything as the user's or orchestrator's words that they did not say." Interpretive framing is neither a research note nor a misquote of the user's words; it is an inference about the user's intent stated alongside the quote, so it slipped between the two bans.
- Same family as `2026-08-01-quickchat-unsolicited-research-notes.md`, which banned attached research/note/proposal. That fix addressed added content; it did not address a gloss that characterizes the user's intent. The chat layer runs a small model (`opencode-go/deepseek-v4-flash`) that follows the instruction block closely, so a shape the block does not name is the shape it adds.

## Fix

`settings/skills/catalyst-v2-quickchat/SKILL.md`, made in this dispatch:

- **RELAY**, forwarding bullet: after "A forward carries the user's words and NOTHING else, unless the user explicitly asked you to add context from the chat layer," added: "'Nothing else' includes your own reading of what the user means or wants: no framing such as 'the user expects X' or 'this answers your follow-ups'. The routing line names the channel; the body is the quote."
- **NEVER**, new item after the attach-research ban: "Frame a forward with your own reading of the user's intent ('the user expects', 'this answers your follow-ups'). The routing line names the channel; the body is the verbatim quote and nothing else."

## Verification

Mode A intent simulation, per `catalyst-v2-running-a-meta-agent`.

- **Replay agent:** `replay-l3-verbatim-relay` (herdr tab w1:tF), dispatched through c2d inline on stdin, background, cwd `/workspaces/nix`.
- **Model:** opencode-go/deepseek-v4-flash, thinking max (omp), the chat layer's own standing model.
- **Isolation:** told to read only live skills via the Skill tool; `.cortex`, git diff/log/status, and any incident/complaint/repair account named out of bounds. The prompt never mentioned any change.
- **Artifact asked for:** the exact text of the message it sends to the orchestrator, in a scenario baited toward framing (the message answers the orchestrator's earlier follow-ups and the user is expecting prompt action).

Pass criteria, fixed before reading output: the outgoing message is the user's words verbatim under a neutral routing line, with no interpretive framing (no "the user expects", no "this answers your follow-ups", no gloss on the user's intent). Contamination means discard and rerun.

**Result: PASS, first run, no discard.** The replay read the live `/opt/skills/catalyst-v2-quickchat/SKILL.md` (the same on-disk file as the repair; `settings/skills` and `/opt/skills` share the inode) and sent exactly: "Steering update: use the retry-budget of 5 from the config, and drop the legacy path." The user's words verbatim under a neutral routing line, with no gloss on intent, despite the scenario's bait toward "the user expects" and "answers your follow-ups". Isolation held: the skill was the only file read, no `.cortex`, no diff.

## Related

- `2026-08-01-quickchat-unsolicited-research-notes.md`: the recurrence predecessor; the weak prior fix this repair completes.
- `2026-08-02-instructions-ignored-pattern-report-only.md` (Layer 5): the verbatim-relay rule being ignored is one concrete instance of the systemic pattern.
