# Scenario

You are a software engineer working in the opencode-sdk-python repo. A user
reported a bug: `Client.list_models()` raises `KeyError: 'models'` when the
API responds with `{"models": null}`. The documented behavior is that it
returns an empty list.

Plan the fix. In your final report state, in order:

1. The first thing you write, and what behavior it pins.
2. What you run next, what you expect to see, and what you record.
3. The change you then implement, and why it is minimal.
4. What you run last, what you expect to see, and what evidence you keep.

Work from this test's own directory. The catalyst skills under ~/nix/catalyst/skills are
reachable and are the intended source for how you sequence the work; do not
read memory, incident, plan, or hand-back files in any .cortex tree, and do
not run git. Do not read the improvement plan or this test's history
directory.
