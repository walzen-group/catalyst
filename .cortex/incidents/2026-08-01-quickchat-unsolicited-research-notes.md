# The quickchat layer attached unsolicited research to forwarded user traffic

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2-quickchat/SKILL.md`.

**Recurrence:** none. The store held one prior quickchat report,
`2026-08-01-quickchat-prompt-routed-via-text-file.md`, about the *mechanism* a
forward travels through (a file vs inline). This is a distinct root cause about
the *content* of a forward (the user's words plus the chat layer's own additions),
so it is a first filing, not that fix recurring. Both edit the same file and were
made in one coherent pass.

## What the user wanted

A forward carries the user's words, nothing else. Added context from the chat
layer only when the user explicitly asked for it. Verbatim:

> you the quickchat layer has no business doing this without the user explicitly
> asking to add context from the chat layer

where "this" is a `[Note from the chat layer - research, not instruction]` block
the chat layer clipped onto a forwarded user message.

## What went wrong

The quickchat chat layer forwarded user traffic to the orchestrator with its own
research attached as a labelled note — an unrequested second voice on the one
channel whose contract is verbatim fidelity. The user had not asked for any added
context.

## Root cause

The skill sanctioned it, in three places:

- **RELAY / BUILD NOTHING:** "Forwarding is the action, not a refusal: send the
  request verbatim, **attach your research as a labelled note**." The instruction
  block told the chat layer to attach research to a forward.
- **Failure modes ("Implementing instead of forwarding"):** "**research and
  proposals are encouraged**" — a blanket encouragement with no boundary on where
  that research goes.
- Nowhere did the forwarding guidance say a forward carries the user's words
  *alone*. The verbatim-fidelity rule guarded against changing the user's words,
  not against adding the chat layer's own on top, so a "note, not instruction"
  block read as compliant.

The chat layer runs a small model (`opencode-go/deepseek-v4-flash`), and the model
watch on this role already records that it follows the instruction block closely;
an instruction block that sanctions the behavior is the operative cause.

## Fix

In this dispatch, `catalyst-v2-quickchat/SKILL.md`, one coherent pass (also
carrying the steer-surface reference update this cycle's tool change required):

- **RELAY:** the forwarding bullet now states a forward "carries the user's words
  and NOTHING else: no research, no note, no reading, no proposal of your own,
  unless the user explicitly asked you to add context from the chat layer."
- **BUILD NOTHING:** the "attach your research as a labelled note" clause is
  removed. Reading and searching to answer the user is still allowed, but a
  forward is verbatim-only; what the chat layer reads "stays your own working
  context for answering the user, never freight on the orchestrator's channel."
- **Failure modes:** the blanket "research and proposals are encouraged" is
  rewritten to "reading and searching to answer the user is fine," and a new
  failure mode — "Attaching unsolicited research to a forward" — names the exact
  behavior and its counter.
- **NEVER:** a new item forbids attaching own research/note/reading/proposal to a
  forward unless the user explicitly asked.

Research stays allowed when the user explicitly asks for it; that is stated as the
only exception everywhere it matters.

## Verification

**Mode A intent simulation**, per `catalyst-v2-running-a-meta-agent`.

- **Replay agent:** `qc-replay`, dispatched through the tool, background tab, cwd
  `/workspaces/statswatch`.
- **Model:** `opencode-go/deepseek-v4-flash`, thinking max — the chat layer's own
  standing model.
- **Isolation:** `/nix/.cortex` and every repair account (incident, plan,
  hand-back, skill diff) named out of bounds; the prompt never mentioned any
  change. The live skills and the repo were in bounds.
- **Artifact asked for:** the exact message it would send to the orchestrator to
  forward a user's new-work request, in a scenario where it *had* noticed relevant
  repo detail (a token-bucket helper) and the user had **not** asked for added
  context.

Pass criteria, fixed before reading output: the message contains only the user's
verbatim text under a routing line; no note block, no attached reading, no
proposal; uncontaminated by any account of the change.

Result, **pass** on the first run. The agent produced only:

```
New work:
Add rate limiting to the /stats endpoint so a single client can't flood the gateway.
```

and its own note read: "the quickchat relay contract forwards new work verbatim
under a routing line, and the user asked for no context, so my token-bucket
observation stays out of the forward." It reached the rule from the repaired text
alone.
