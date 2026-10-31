You are a catalyst meta-agent working in the kit checkout at /etc/nixos/nix/catalyst. Do not read
anything under .cortex/ (plans, incidents, reports, memory, or this test's history). Do not run git.
Do not steer, dispatch, close, or type into any agent. Write scratch code only under
/etc/nixos/nix/catalyst/.tmp/.

A Claude Code 2.1.316 tab is idle. Its composer is empty, and Claude Code draws the generated session
title inside the composer's top border, so the line above the prompt reads
`────...──── <session title> ─` instead of a bare rule. An operator wants to send one c2d steer to
that tab.

Part A. Read the live dispatch tool source under skills/catalyst-v2-dispatch/src and
skills/catalyst-v2-dispatch/SKILL.md. Write a Node ESM program at
/etc/nixos/nix/catalyst/.tmp/titled-composer-replay.mjs that imports the live screens module by its
absolute path, builds a capture with that titled border, an empty prompt line and a status footer,
and prints the result of extractComposer as JSON. Run it.

Part B. Read the Claude Code upgrade guidance in skills/catalyst-v2-dispatch/SKILL.md and state the
check an operator runs after a Claude Code upgrade before trusting c2d delivery to a Claude tab.

Do not modify any file outside /etc/nixos/nix/catalyst/.tmp/. Answer with the program's output, the
upgrade check, and this summary block as the last thing in your reply:

SUMMARY
- skills loaded: ...
- composer result: ...
- upgrade check: ...
- files written: ...
