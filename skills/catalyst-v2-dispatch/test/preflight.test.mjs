// Roster-aware worker-needs-meta refusal, and that it collects with the rest.
// The gate: a worker (kind is not `unit`, and the agent is not itself a meta by
// name prefix or monitoring brief) may launch only with a meta present in the
// same call or live on the roster.

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { preflight } from '../src/preflight.mjs';

const realCwd = mkdtempSync(join(tmpdir(), 'catalyst-preflight-'));

// A validated-shape agent: kind defaults to worker, brief carries the text the
// meta-brief regex reads.
function agent(overrides = {}) {
  return {
    name: 'impl-x',
    cwd: realCwd,
    cli: 'claude',
    model: 'claude-opus-4-8',
    kind: 'worker',
    brief: { mode: 'inline', text: 'do work' },
    ...overrides,
  };
}

function needsMeta(failures) {
  return failures.some((f) => /is a worker but no meta-agent is present/.test(f));
}

test('a lone worker with no meta in call and none on roster is refused', () => {
  const result = preflight({ agents: [agent()] }, []);
  assert.equal(result.ok, false);
  assert.equal(needsMeta(result.failures), true);
  const failure = result.failures.find((f) => needsMeta([f]));
  assert.match(failure, /"impl-x"/);
  assert.match(failure, /kind: "unit"/);
});

test('a worker plus a meta-* agent in the same call is ok', () => {
  const result = preflight(
    { agents: [agent(), agent({ name: 'meta-watch' })] },
    [],
  );
  assert.equal(result.ok, true, result.failures.join('; '));
});

test('a worker alone with a live meta-* on the roster is ok', () => {
  const result = preflight({ agents: [agent()] }, [{ name: 'meta-live' }]);
  assert.equal(result.ok, true, result.failures.join('; '));
});

// Regression: meta detection is name-prefix only. A monitoring-style brief on a
// non-meta- partner must NOT satisfy the requirement, and a worker whose own
// brief says "hand back" is still a worker. (A worker brief legitimately reads
// "Hand back a diff"; a brief-text heuristic would let it bypass the gate.)
test('a non-meta- partner with a monitoring brief does not satisfy the requirement', () => {
  const partner = agent({
    name: 'watcher',
    brief: { mode: 'inline', text: 'monitor the workers and hand back' },
  });
  const result = preflight({ agents: [agent(), partner] }, []);
  assert.equal(result.ok, false);
  // Both agents are workers (neither is named meta-*), so both are refused.
  assert.equal(result.failures.filter((f) => /is a worker but no meta-agent/.test(f)).length, 2);
});

test('a worker whose own brief contains "hand back" is still refused with no meta present', () => {
  const worker = agent({ brief: { mode: 'inline', text: 'Hand back a diff of the meta-agent changes' } });
  const result = preflight({ agents: [worker] }, []);
  assert.equal(result.ok, false);
  assert.equal(needsMeta(result.failures), true);
});

test('a kind: "unit" agent alone is ok', () => {
  const result = preflight({ agents: [agent({ kind: 'unit' })] }, []);
  assert.equal(result.ok, true, result.failures.join('; '));
});

test('a lone meta is ok', () => {
  const result = preflight({ agents: [agent({ name: 'meta-solo' })] }, []);
  assert.equal(result.ok, true, result.failures.join('; '));
});

test('all failures collect: worker-needs-meta beside an unrelated cwd failure', () => {
  const result = preflight(
    { agents: [agent({ cwd: '/no/such/dir' })] },
    [],
  );
  assert.equal(result.ok, false);
  assert.equal(needsMeta(result.failures), true);
  assert.equal(
    result.failures.some((f) => /cwd: "\/no\/such\/dir" does not exist/.test(f)),
    true,
  );
});

// --- curator kind: meta-gate exemption and single-writer ----------------------

function singleWriter(failures) {
  return failures.filter((f) => /the memory store is single-writer/.test(f));
}

test('a kind: "curator" agent alone is exempt from the meta gate', () => {
  const result = preflight({ agents: [agent({ name: 'the-curator', kind: 'curator' })] }, []);
  assert.equal(result.ok, true, result.failures.join('; '));
});

test('two curators in one call are refused by single-writer, one per offending agent', () => {
  const result = preflight(
    {
      agents: [
        agent({ name: 'the-curator', kind: 'curator' }),
        agent({ name: 'the-curator-b', kind: 'curator' }),
      ],
    },
    [],
  );
  assert.equal(result.ok, false);
  assert.equal(singleWriter(result.failures).length, 2);
});

test('a curator launch is refused when a curator name is live on the roster, and names it', () => {
  const result = preflight(
    { agents: [agent({ name: 'the-curator', kind: 'curator' })] },
    [{ name: 'the-curator' }],
  );
  assert.equal(result.ok, false);
  const failure = singleWriter(result.failures)[0];
  assert.ok(failure, 'expected a single-writer refusal');
  assert.match(failure, /a curator is already live \(the-curator\)/);
  assert.match(failure, /retire it before curating again/);
});

// --- style_file existence -----------------------------------------------------

test('a style_file that does not exist is refused', () => {
  const result = preflight(
    { agents: [agent({ style_file: '/no/such/persona.md' })] },
    [{ name: 'meta-live' }],
  );
  assert.equal(result.ok, false);
  assert.match(
    result.failures.join(' '),
    /style_file: "\/no\/such\/persona\.md" does not exist or is not readable/,
  );
});

test('an existing readable style_file passes preflight', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalyst-style-'));
  const persona = join(dir, 'persona.md');
  writeFileSync(persona, '---\nname: x\n---\nbody');
  const result = preflight({ agents: [agent({ style_file: persona, kind: 'unit' })] }, []);
  assert.equal(result.ok, true, result.failures.join('; '));
});
