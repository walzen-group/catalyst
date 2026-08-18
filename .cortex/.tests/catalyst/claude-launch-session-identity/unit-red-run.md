✔ a dispatch result document records the full delivered text, mandate and all (355.081779ms)
✔ a default dispatch records the resolved mandate mode as injected (347.647001ms)
✔ a caller-owned unit dispatch delivers the fixture byte-for-byte and records caller_owned (348.065434ms)
✔ an unknown mandate_mode input fails before launch, nothing sent (4.861732ms)
✔ a caller_owned input with a non-unit agent fails before launch, nothing sent (2.134982ms)
✔ the rest of the dispatch result document keeps its shape (332.983941ms)
✖ a claude launch with no agent_session published still completes; session identity is derived from herdr fields (287.947625ms)
✔ the omp session gate is not weakened: a session-less omp launch still fails session_not_established (405.800774ms)
✔ a steer to an omp agent lands via the confirmed prompt and prescribes a settle wake (383.583352ms)
✔ a steer result records the raw steer text, unchanged, no mandate (371.287816ms)
✔ a wake is prescribed even for a target that already settled (375.01126ms)
✔ a steer to an omp agent holding a live draft is refused with the draft as specimen (204.109993ms)
✔ a steer at the queued-messages hint is delivered, and counted consumed (817.536537ms)
✔ a steer into a composer someone is typing in is still refused (311.763401ms)
✔ a steer whose omp prompt parks fails, with no false consumption and no phantom wake (304.354577ms)
✔ a steer delivery failure preserves the target session and tab (319.417297ms)
✔ a blocked agent is reported with a herdr hint, never answered or steered (71.19461ms)
✖ a steer to a claude agent with no agent_session published still delivers, keyed on the derived identity (156.782611ms)
ℹ tests 18
ℹ suites 0
ℹ pass 16
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3406.265136

✖ failing tests:

test at test/launch.test.mjs:269:1
✖ a claude launch with no agent_session published still completes; session identity is derived from herdr fields (287.947625ms)
  AssertionError [ERR_ASSERTION]: [{"agent":"probe-claude","step":"session_not_established","detail":"no interactive screen was left to clear (startup screen: none) and the agent published no session within the session wait window","herdr_output":{"argv":["/etc/nixos/nix/catalyst/skills/catalyst-v2-dispatch/test/helpers/fake-herdr.mjs","agent","get","probe-claude"],"status":0,"stdout":"{\"id\":\"cli:agent:get\",\"result\":{\"agent\":{\"agent\":\"claude\",\"agent_status\":\"working\",\"cwd\":\"/tmp/catalyst-verify-omp\",\"interactive_ready\":true,\"name\":\"probe-claude\",\"pane_id\":\"w1:p9\",\"tab_id\":\"w1:t9\",\"terminal_id\":\"term_0804\"}}}\n","stderr":""}}]
  
  'failed' !== 'ok'
  
      at TestContext.<anonymous> (file:///etc/nixos/nix/catalyst/skills/catalyst-v2-dispatch/test/launch.test.mjs:294:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:960:18)
      at Test.postRun (node:internal/test_runner/test:1522:19)
      at Test.run (node:internal/test_runner/test:1447:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 'failed',
    expected: 'ok',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test/steer.test.mjs:303:1
✖ a steer to a claude agent with no agent_session published still delivers, keyed on the derived identity (156.782611ms)
  AssertionError [ERR_ASSERTION]: {"agent":"orchestrator","step":"brief_delivery","detail":"the agent has no session, so this delivery could be neither recorded nor attributed"}
  
  'failed' !== 'ok'
  
      at TestContext.<anonymous> (file:///etc/nixos/nix/catalyst/skills/catalyst-v2-dispatch/test/steer.test.mjs:318:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:960:18)
      at Test.postRun (node:internal/test_runner/test:1522:19)
      at Test.run (node:internal/test_runner/test:1447:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 'failed',
    expected: 'ok',
    operator: 'strictEqual',
    diff: 'simple'
  }
