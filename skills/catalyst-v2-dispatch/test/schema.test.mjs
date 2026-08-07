// Effort optionality for claude agents, and the gating that stays.
// Change: the 2026-08-01 model policy assigns default effort to the
// claude-opus-4-8 frontier and meta-agent roles, so a claude agent may omit
// effort and let the CLI use its built-in default.

import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';

import { main } from '../src/cli.mjs';
import { modelTail, validateDispatchInput } from '../src/schema.mjs';

function dispatchDoc(agentOverrides) {
  return {
    dispatch_id: 'test-effort-optional',
    heartbeat_ms: 60000,
    agents: [
      {
        name: 'agent-a',
        cwd: '/tmp/catalyst-dispatch-test',
        cli: 'claude',
        model: 'opus',
        brief: { mode: 'inline', text: 'do the thing' },
        ...agentOverrides,
      },
    ],
  };
}

function validAgent(doc) {
  const result = validateDispatchInput(doc);
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('; '));
  return result.value.agents[0];
}

test('a claude agent without effort validates and its launch tail has no --effort', () => {
  const agent = validAgent(dispatchDoc({}));
  assert.equal('effort' in agent, false);
  assert.deepEqual(modelTail(agent), ['--model', 'opus']);

  // `null` spells the same as omitted: no effort, CLI built-in default.
  const explicitNull = validAgent(dispatchDoc({ effort: null }));
  assert.equal('effort' in explicitNull, false);
  assert.deepEqual(modelTail(explicitNull), ['--model', 'opus']);
});

test('a claude agent with effort medium keeps the current flag behavior', () => {
  const agent = validAgent(dispatchDoc({ effort: 'medium' }));
  assert.equal(agent.effort, 'medium');
  assert.deepEqual(modelTail(agent), ['--model', 'opus', '--effort', 'medium']);
});

test('xhigh and max still require user_directive: true', () => {
  for (const effort of ['xhigh', 'max']) {
    const refused = validateDispatchInput(dispatchDoc({ effort }));
    assert.equal(refused.ok, false);
    assert.deepEqual(refused.errors, [
      `agents[0].effort: "${effort}" requires user_directive: true on the same agent`,
    ]);

    const allowed = validateDispatchInput(dispatchDoc({ effort, user_directive: true }));
    assert.equal(allowed.ok, true, allowed.ok ? '' : allowed.errors.join('; '));
    assert.equal(allowed.value.agents[0].effort, effort);
  }
});

test('an omp agent without thinking is still refused', () => {
  const refused = validateDispatchInput(dispatchDoc({ cli: 'omp' }));
  assert.equal(refused.ok, false);
  assert.deepEqual(refused.errors, ['agents[0].thinking: required for cli "omp"']);

  const allowed = validateDispatchInput(dispatchDoc({ cli: 'omp', thinking: 'low' }));
  assert.equal(allowed.ok, true, allowed.ok ? '' : allowed.errors.join('; '));
  assert.equal(allowed.value.agents[0].thinking, 'low');
});

test('thinking stays forbidden for cli "claude"', () => {
  const refused = validateDispatchInput(dispatchDoc({ thinking: 'low' }));
  assert.equal(refused.ok, false);
  assert.deepEqual(refused.errors, ['agents[0].thinking: forbidden for cli "claude"']);
});

test('kind defaults to worker when absent, and null spells the same', () => {
  const agent = validAgent(dispatchDoc({}));
  assert.equal(agent.kind, 'worker');
  assert.equal(validAgent(dispatchDoc({ kind: null })).kind, 'worker');
});

test('kind: "unit" and kind: "worker" are accepted and carried', () => {
  assert.equal(validAgent(dispatchDoc({ kind: 'unit' })).kind, 'unit');
  assert.equal(validAgent(dispatchDoc({ kind: 'worker' })).kind, 'worker');
});

test('kind: "curator" is accepted and carried', () => {
  assert.equal(validAgent(dispatchDoc({ kind: 'curator' })).kind, 'curator');
});

test('an invalid kind value is refused', () => {
  const refused = validateDispatchInput(dispatchDoc({ kind: 'meta' }));
  assert.equal(refused.ok, false);
  assert.deepEqual(refused.errors, ['agents[0].kind: must be one of worker, unit, curator']);

  const nonString = validateDispatchInput(dispatchDoc({ kind: 7 }));
  assert.equal(nonString.ok, false);
  assert.deepEqual(nonString.errors, ['agents[0].kind: must be one of worker, unit, curator']);
});

test('style_file: an optional non-empty string is accepted and carried', () => {
  const agent = validAgent(dispatchDoc({ style_file: '/some/persona.md', kind: 'curator' }));
  assert.equal(agent.style_file, '/some/persona.md');
});

test('style_file: absent means no style_file key on the validated agent', () => {
  assert.equal('style_file' in validAgent(dispatchDoc({})), false);
});

test('style_file: an empty string is refused', () => {
  const refused = validateDispatchInput(dispatchDoc({ style_file: '' }));
  assert.equal(refused.ok, false);
  assert.deepEqual(refused.errors, ['agents[0].style_file: must be a non-empty string']);
});

test('an unknown agent key is still refused', () => {
  const refused = validateDispatchInput(dispatchDoc({ kindof: 'unit' }));
  assert.equal(refused.ok, false);
  assert.deepEqual(refused.errors, ['agents[0].kindof: unknown key']);
});

// User directive 2026-08-04: dispatch delivery either injects the pinned
// catalyst mandate ahead of the brief (`injected`, the default) or sends the
// caller's brief unchanged (`caller_owned`), and `caller_owned` is valid only
// for an all-unit wave: the caller owns the complete prompt, so no worker,
// meta, or curator may ride it. The resolved mode rides the validated document.

test('mandate_mode defaults to injected when omitted, and null spells the same', () => {
  const doc = validateDispatchInput(dispatchDoc({ kind: 'unit' }));
  assert.equal(doc.ok, true, doc.ok ? '' : doc.errors.join('; '));
  assert.equal(doc.value.mandate_mode, 'injected');

  const explicitNull = validateDispatchInput({ ...dispatchDoc({ kind: 'unit' }), mandate_mode: null });
  assert.equal(explicitNull.ok, true, explicitNull.ok ? '' : explicitNull.errors.join('; '));
  assert.equal(explicitNull.value.mandate_mode, 'injected');
});

test('mandate_mode injected and unit-only caller_owned are accepted and carried', () => {
  const injected = validateDispatchInput({ ...dispatchDoc({ kind: 'unit' }), mandate_mode: 'injected' });
  assert.equal(injected.ok, true, injected.ok ? '' : injected.errors.join('; '));
  assert.equal(injected.value.mandate_mode, 'injected');

  const owned = validateDispatchInput({ ...dispatchDoc({ kind: 'unit' }), mandate_mode: 'caller_owned' });
  assert.equal(owned.ok, true, owned.ok ? '' : owned.errors.join('; '));
  assert.equal(owned.value.mandate_mode, 'caller_owned');
});

test('an unknown mandate_mode value is refused', () => {
  for (const bad of ['replay', 'none', 7, true]) {
    const refused = validateDispatchInput({ ...dispatchDoc({ kind: 'unit' }), mandate_mode: bad });
    assert.equal(refused.ok, false, JSON.stringify(bad));
    assert.deepEqual(refused.errors, ['mandate_mode: must be one of injected, caller_owned']);
  }
});

test('caller_owned is refused for worker, curator, and meta agents', () => {
  const worker = validateDispatchInput({ ...dispatchDoc({ kind: 'worker' }), mandate_mode: 'caller_owned' });
  assert.equal(worker.ok, false);
  assert.deepEqual(worker.errors, [
    'agents[0].kind: mandate_mode "caller_owned" requires kind "unit" on every agent; "agent-a" is a "worker"',
  ]);

  const omittedKind = validateDispatchInput({ ...dispatchDoc({}), mandate_mode: 'caller_owned' });
  assert.equal(omittedKind.ok, false, 'kind defaults to worker, so an omitted kind is refused too');
  assert.deepEqual(omittedKind.errors, [
    'agents[0].kind: mandate_mode "caller_owned" requires kind "unit" on every agent; "agent-a" is a "worker"',
  ]);

  const curator = validateDispatchInput({ ...dispatchDoc({ kind: 'curator' }), mandate_mode: 'caller_owned' });
  assert.equal(curator.ok, false);
  assert.deepEqual(curator.errors, [
    'agents[0].kind: mandate_mode "caller_owned" requires kind "unit" on every agent; "agent-a" is a "curator"',
  ]);

  // A meta rides under its reserved name prefix and a worker kind.
  const meta = validateDispatchInput({ ...dispatchDoc({ name: 'meta-1', kind: 'worker' }), mandate_mode: 'caller_owned' });
  assert.equal(meta.ok, false);
  assert.deepEqual(meta.errors, [
    'agents[0].kind: mandate_mode "caller_owned" requires kind "unit" on every agent; "meta-1" is a "worker"',
  ]);
});

test('dry-run prints a model tail without --effort when effort is omitted', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'catalyst-dispatch-dryrun-'));
  // kind: unit so preflight's worker-needs-meta gate does not refuse this
  // single-agent dry-run; the test is about the model tail, not the meta rule.
  const doc = dispatchDoc({ cwd, kind: 'unit' });
  let out = '';
  const code = await main(['dispatch', '--dry-run'], {
    out: { write: (chunk) => { out += chunk; } },
    err: { write: () => {} },
    stdin: Readable.from([JSON.stringify(doc)]),
    fetchRoster: () => [],
  });
  assert.equal(code, 0);
  const plan = JSON.parse(out);
  assert.equal(plan.mode, 'dry-run');
  assert.equal(plan.agents[0].effort, null);
  assert.deepEqual(plan.agents[0].launch_args, ['--model', 'opus']);
  assert.equal(plan.agents[0].model_tail, '--model opus');
});
