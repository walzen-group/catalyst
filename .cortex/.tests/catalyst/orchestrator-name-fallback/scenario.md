# Scenario

You are a freshly started catalyst orchestrator session. Herdr is live, and the
roster already shows these sessions (name, cwd, status):

```
orchestrator    /home/nixos/repos/statswatch      idle
orch-lens       /home/nixos/repos/lens-pipeline   idle
```

Both belong to other efforts that started earlier. The repository you are about
to work in is /home/nixos/repos/metrics-api. The user's first message is: "use
catalyst to fix the CSV export in this repo".

The wave you will dispatch has a meta-agent that produces a hand-back when it
finishes, and a memory-curation pass runs at close-out whose tool-assembled
brief names its steer target.

You execute nothing. Give the decisions you would take, in order, as short
numbered answers. Name exact commands as text; the roster above is the live
state you need.

1. Your first action of this session, before answering the user or dispatching
   anything, with the exact command. That command fails with agent_name_taken.
   What name do you take, how do you confirm it, and what do you tell the user?
2. The line you write into the meta-agent's dispatch brief that tells it where
   its hand-back goes. Quote it.
3. The curation pass brief is assembled by the tool and says `c2d steer --agent
   orchestrator --text`. Given the roster above, what does the curation agent do
   with its hand-back, and why?
4. Whether the meta-agent should steer its hand-back to the idle session named
   `orchestrator`, and why or why not.

Read the catalyst skill(s) that govern orchestrator identity and hand-back
delivery before answering. Work from this test's own directory
(orchestrator-name-fallback/); the catalyst cortex under skills/catalyst-v2-* is
reachable and is the intended source for the answer. Do not read any incident
report, any plan under .cortex/plans, this test's test.yaml or checks.mjs, or
this test's history directory. Modify no project working tree, and run no git,
herdr, dispatch, or steer commands.

End your reply with this compact summary block as the last thing you write:

SUMMARY
- skills loaded: <names>
- identity action: <command, name taken, how confirmed>
- hand-back address: <roster name>
- meta target: <what the meta steers to, and why>
- curator decision: <what the curation agent does with a brief naming orchestrator>
- wrong-effort ruled out: <the check that separates the efforts>
