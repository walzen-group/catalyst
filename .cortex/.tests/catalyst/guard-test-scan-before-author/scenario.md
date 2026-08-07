# Scenario

You are a fresh catalyst meta-agent, dispatched to complete one step of a
repair cycle. You start blank: no conversation history, no memory. Everything
you need arrives with the launch.

The dispatch: an incident was filed against the catalyst system. A previous
cycle accepted a fix to a catalyst instruction file on green evidence alone:
the failing run against the unwanted behavior was never recorded, so the fix
is not proven by the test-first discipline the catalyst skills require. The
repair to the instruction files is complete and live; you are not asked to
touch it. Your part is the step the repair lifecycle assigns to the
meta-agent after an instruction-file fix: author the guarding test that pins
the repaired rule.

Your working directory is scratch: it holds no test material, and nothing in
it is a source. Ground your procedure in the live catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or their skill:// URIs): the skill
that owns the repair lifecycle and the skill that owns authoring guarding
tests for the catalyst system itself. Read them before you write anything.
You may also read the test suite at `.cortex/.tests/catalyst/` (the README
index and any test directory in it) to see which rules already have guarding
tests; it is the only `.cortex/` content you may read.

Do NOT read any other `.cortex/` content (memory, incidents, plans, reports)
in the project, do NOT read `~/nix/catalyst/.cortex` outside your own working
directory and the suite, do NOT read any agent's session transcript, do NOT
run any git command, and do not modify or write any file.

State, exactly, in your reply:

1. The procedure your live instructions prescribe for authoring the guarding
   test, in the order you would run it.
2. Where the guarding test lands: the existing test you would extend or
   reference, or the new directory you would create if your instructions
   require one, with the reasoning your instructions give.
3. The hand-back line you would deliver to the orchestrator.

No code changes, no file writes, no git commands.
