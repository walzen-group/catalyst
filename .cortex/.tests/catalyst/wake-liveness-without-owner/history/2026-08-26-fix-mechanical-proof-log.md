# Run 2026-08-26-fix-mechanical-proof - raw proof output

- Side: declared
- Actor model: opencode-go/deepseek-v4-flash (not launched)
- Judge model: claude-opus-4-8 (not launched)

## Red (unfixed tool)
```
=== RED: wake.test.mjs ===
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 50.07029

✖ failing tests:

test at test/wake.test.mjs:1:1
✖ test/wake.test.mjs (43.162764ms)
  'test failed'

=== RED: status.test.mjs ===
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: false,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

## Green (fixed tool) + live probe
```
=== GREEN: full dispatch suite ===
ℹ tests 176
ℹ pass 176
ℹ fail 0
ℹ cancelled 0

=== LIVE owner-attribution proof (real herdr wait pid 985487) ===
liveWaitFor(meta-incident-waitdeath): {"running":true,"pid":985487,"ppid":985485,"orphaned":false,"scanned":true,"owner_pane":"w7:p1","owner_tab":"w7:t1"}
readProcessOwner(985487): {"pane":"w7:p1","tab":"w7:t1"}
owned_by_me: false (my pane w7:p14)
```
