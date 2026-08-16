// Check A: a repair dispatch must carry an incident. A repair is a worker-like
// kind (it still needs a meta present), and it must name an existing incident
// report under a .cortex/incidents/ tree. Preflight refuses a repair whose
// incident_path is absent, outside a .cortex/incidents/ tree, or does not resolve
// to an existing file, naming the agent and the offending path.

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { preflight } from '../src/preflight.mjs';
import { validateDispatchInput } from '../src/schema.mjs';

const realCwd = mkdtempSync(join(tmpdir(), 'catalyst-repair-'));
const incidentDir = join(realCwd, '.cortex', 'incidents');
mkdirSync(incidentDir, { recursive: true });
const incidentFile = join(incidentDir, '2026-08-16-some-failure.md');
writeFileSync(incidentFile, '# incident\n');

// A validated-shape repair agent naming a real incident. Overrides let a test
// drop or corrupt the incident reference.
function repair(overrides = {}) {
  return {
    name: 'fix-x',
    cwd: realCwd,
    cli: 'claude',
    model: 'claude-opus-4-8',
    kind: 'repair',
    incident_path: incidentFile,
    brief: { mode: 'inline', text: 'repair it' },
    ...overrides,
  };
}

// A meta partner so the worker-needs-meta gate is satisfied and the tests below
// isolate the incident rule.
const meta = {
  name: 'meta-watch',
  cwd: realCwd,
  cli: 'claude',
  model: 'claude-opus-4-8',
  kind: 'worker',
  brief: { mode: 'inline', text: 'watch' },
};

function incidentFailure(failures) {
  return failures.filter((f) => /incident/i.test(f));
}

test('a repair dispatch with no incident_path is refused, naming the agent', () => {
  const { incident_path, ...noIncident } = repair();
  const result = preflight({ agents: [noIncident, meta] }, []);
  assert.equal(result.ok, false);
  const failure = incidentFailure(result.failures).find((f) => /fix-x/.test(f));
  assert.ok(failure, `expected an incident refusal naming the agent: ${result.failures.join('; ')}`);
});

test('a repair with a non-existent incident_path is refused, naming the path', () => {
  const bogus = join(incidentDir, 'nope.md');
  const result = preflight({ agents: [repair({ incident_path: bogus }), meta] }, []);
  assert.equal(result.ok, false);
  const failure = result.failures.find((f) => f.includes(bogus));
  assert.ok(failure, `expected a refusal naming the missing incident: ${result.failures.join('; ')}`);
  assert.match(failure, /does not exist/);
});

test('a repair incident_path outside a .cortex/incidents tree is refused', () => {
  const planDir = join(realCwd, '.cortex', 'plans');
  mkdirSync(planDir, { recursive: true });
  const planDoc = join(planDir, 'task.md');
  writeFileSync(planDoc, 'a plan, not an incident\n');
  const result = preflight({ agents: [repair({ incident_path: planDoc }), meta] }, []);
  assert.equal(result.ok, false);
  assert.match(result.failures.join(' '), /\.cortex\/incidents/);
});

test('a repair naming an existing incident under .cortex/incidents passes preflight, given a meta', () => {
  const result = preflight({ agents: [repair(), meta] }, []);
  assert.equal(result.ok, true, result.failures.join('; '));
});

test('a repair is worker-like: it still needs a meta present', () => {
  const result = preflight({ agents: [repair()] }, []);
  assert.equal(result.ok, false);
  assert.match(result.failures.join(' '), /no meta-agent is present/);
});

test('schema accepts a repair kind carrying incident_path', () => {
  const input = {
    dispatch_id: 'd',
    heartbeat_ms: 1000,
    agents: [
      { name: 'fix-x', cwd: realCwd, cli: 'claude', model: 'm', kind: 'repair', incident_path: incidentFile, brief: { mode: 'inline', text: 'go' } },
      { name: 'meta-w', cwd: realCwd, cli: 'claude', model: 'm', kind: 'worker', brief: { mode: 'inline', text: 'watch' } },
    ],
  };
  const result = validateDispatchInput(input);
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('; '));
  assert.equal(result.value.agents[0].kind, 'repair');
  assert.equal(result.value.agents[0].incident_path, incidentFile);
});

// Negative check: a normal worker (with a meta) is unaffected by the repair rule
// — no incident is required of it.
test('a normal worker needs no incident_path', () => {
  const worker = { name: 'impl-y', cwd: realCwd, cli: 'claude', model: 'm', kind: 'worker', brief: { mode: 'inline', text: 'work' } };
  const result = preflight({ agents: [worker, meta] }, []);
  assert.equal(result.ok, true, result.failures.join('; '));
});
