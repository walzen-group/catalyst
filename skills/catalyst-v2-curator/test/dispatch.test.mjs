// curate/summon assemble a dispatch document c2m hands to c2d. The proof that
// matters: the assembled document validates against c2d's own schema (curator
// kind, style_file, claude cli), and summon carries the interactive gates.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateDispatchInput } from '../../catalyst-v2-dispatch/src/schema.mjs';
import { buildCurateDispatch, buildSummonDispatch, curatorPersonaPath } from '../src/dispatch.mjs';

const CLOCK = new Date('2026-08-04T07:15:00.000Z');
const TREE = '/tmp/some/.cortex/memory';

test('curatorPersonaPath points at the-curator.md in the curator skill dir', () => {
  assert.match(curatorPersonaPath(), /catalyst-v2-curator\/the-curator\.md$/);
});

test('buildCurateDispatch produces a document c2d validates', () => {
  const doc = buildCurateDispatch(TREE, { model: 'sonnet', now: CLOCK });
  const result = validateDispatchInput(doc);
  assert.ok(result.ok, `expected valid, got: ${JSON.stringify(result.errors)}`);
});

test('the curator agent carries the required fields', () => {
  const doc = buildCurateDispatch(TREE, { model: 'sonnet', now: CLOCK });
  const agent = doc.agents[0];
  assert.equal(agent.name, 'the-curator');
  assert.equal(agent.cli, 'claude');
  assert.equal(agent.model, 'sonnet');
  assert.equal(agent.kind, 'curator');
  assert.match(agent.style_file, /the-curator\.md$/);
  assert.equal(agent.brief.mode, 'inline');
  assert.match(agent.brief.text, /\/tmp\/some\/\.cortex\/memory/, 'brief names the tree');
  // A claude delegate names no effort and no thinking (retired for claude).
  assert.equal(agent.effort, undefined);
  assert.equal(agent.thinking, undefined);
  // curate is autonomous: not focused, not user-triggered.
  assert.ok(!agent.focus);
});

test('the effort plan dir is threaded into the brief when given', () => {
  const doc = buildCurateDispatch(TREE, {
    model: 'sonnet',
    effort: '/tmp/some/.cortex/plans/2026-08-03-x',
    now: CLOCK,
  });
  assert.match(doc.agents[0].brief.text, /2026-08-03-x/);
});

test('the curate brief ends at reindex plus a delivered hand-back: no git, steer delivery', () => {
  const doc = buildCurateDispatch(TREE, { model: 'sonnet', now: CLOCK });
  const brief = doc.agents[0].brief.text;
  assert.doesNotMatch(brief, /\bgit\b/, 'brief must not instruct the curator to use git');
  assert.match(brief, /c2d steer --agent orchestrator --text/, 'brief names the steer delivery channel');
  assert.match(brief, /A2A:/, 'the steer text carries the A2A prefix');
  assert.match(brief, /\/tmp\/some\/\.cortex\/reports\/handbacks/, 'brief names the steer-failure fallback');
  assert.match(brief, /REINDEX/, 'the pass still ends at reindex');
});

test('buildSummonDispatch is focused, user-triggered, and c2d-valid', () => {
  const doc = buildSummonDispatch(TREE, { model: 'sonnet', now: CLOCK });
  const result = validateDispatchInput(doc);
  assert.ok(result.ok, `expected valid, got: ${JSON.stringify(result.errors)}`);
  const agent = doc.agents[0];
  assert.equal(agent.focus, true);
  assert.equal(agent.user_triggered, true);
  assert.equal(agent.kind, 'curator');
});

test('each dispatch carries a distinct id and a positive heartbeat', () => {
  const doc = buildCurateDispatch(TREE, { model: 'sonnet', now: CLOCK });
  assert.match(doc.dispatch_id, /curator/);
  assert.ok(Number.isFinite(doc.heartbeat_ms) && doc.heartbeat_ms > 0);
});

test('the curate brief directs adopt for ledger-less files and no copying outside the tree', () => {
  const doc = buildCurateDispatch(TREE, { model: 'sonnet', now: CLOCK });
  const brief = doc.agents[0].brief.text;
  assert.match(brief, /c2m adopt/, 'the brief names the adopt verb for ledger-less files');
  assert.match(brief, /outside the tree/, 'the brief forbids copying store content out');
  assert.match(brief, /hand-edit the ledger/, 'the single-writer rule stays');
});

test('the summon brief is talk-only: it answers, and runs no pass steps', () => {
  const doc = buildSummonDispatch(TREE, { model: 'sonnet', now: CLOCK });
  const brief = doc.agents[0].brief.text;
  assert.match(brief, /talk/, 'the brief frames the summon as a conversation');
  assert.match(brief, /only when the user explicitly asks/, 'verbs apply only on explicit instruction');
  assert.match(brief, /no automatic pass/, 'no pass runs on its own');
  assert.doesNotMatch(brief, /DECAY the store/, 'no decay pass step');
  assert.doesNotMatch(brief, /REINDEX/, 'no reindex pass step');
  assert.doesNotMatch(brief, /git commit/, 'no commit pass step');
});

test('the curate brief still carries the pass steps', () => {
  const doc = buildCurateDispatch(TREE, { model: 'sonnet', now: CLOCK });
  const brief = doc.agents[0].brief.text;
  assert.match(brief, /DECAY the store/, 'the pass still decays the store');
  assert.match(brief, /REINDEX/, 'the pass still ends at reindex');
});

test('both dispatches keep their interaction flags', () => {
  const curate = buildCurateDispatch(TREE, { model: 'sonnet', now: CLOCK }).agents[0];
  const summon = buildSummonDispatch(TREE, { model: 'sonnet', now: CLOCK }).agents[0];
  assert.equal(curate.focus, undefined, 'curate stays autonomous');
  assert.equal(curate.user_triggered, undefined, 'curate stays autonomous');
  assert.equal(summon.focus, true, 'summon stays focused');
  assert.equal(summon.user_triggered, true, 'summon stays user-triggered');
});
