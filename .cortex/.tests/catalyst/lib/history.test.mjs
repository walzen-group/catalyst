import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { latestPrior, renderMarkdown, runIdFrom, writeRun } from './history.mjs';
import { tempSuite } from './fixtures.mjs';

function record(overrides = {}) {
  return {
    run_id: '2026-08-02T10-00-00',
    timestamp: '2026-08-02T10:00:00.000Z',
    config_source: 'declared',
    side: 'declared',
    models_used: { actor: 'a', judge: 'j' },
    duration_ms: 42,
    criteria: [{ id: 'c1', kind: 'semantic', status: 'pass', detail: 'ok' }],
    judge_reasoning: 'looks good',
    regressions: [],
    errored: false,
    ...overrides,
  };
}

test('runIdFrom yields a filesystem-safe id', () => {
  const id = runIdFrom(new Date('2026-08-02T14:05:09.123Z'));
  assert.equal(id, '2026-08-02T14-05-09');
  assert.doesNotMatch(id, /[:.]/);
});

test('writeRun writes JSON and MD, and never overwrites a prior run', () => {
  const dir = join(tempSuite(), 'history');
  const first = writeRun(dir, record());
  assert.ok(existsSync(first.jsonPath));
  assert.ok(existsSync(first.mdPath));
  const second = writeRun(dir, record());
  assert.notEqual(second.runId, first.runId);
  assert.ok(existsSync(first.jsonPath), 'first run still present');
});

test('the JSON record carries the documented schema', () => {
  const dir = join(tempSuite(), 'history');
  const { jsonPath } = writeRun(dir, record());
  const doc = JSON.parse(readFileSync(jsonPath, 'utf8'));
  for (const key of ['run_id', 'timestamp', 'config_source', 'side', 'models_used', 'duration_ms', 'criteria', 'judge_reasoning', 'regressions']) {
    assert.ok(key in doc, `record has ${key}`);
  }
});

test('latestPrior returns the newest record, or null when none', () => {
  const dir = join(tempSuite(), 'history');
  assert.equal(latestPrior(dir), null);
  writeRun(dir, record({ run_id: '2026-08-01T00-00-00' }));
  writeRun(dir, record({ run_id: '2026-08-03T00-00-00', judge_reasoning: 'newest' }));
  assert.equal(latestPrior(dir).judge_reasoning, 'newest');
});

test('runIdFrom appends an actor-model suffix when given one', () => {
  const date = new Date('2026-08-02T14:05:09.123Z');
  assert.equal(runIdFrom(date), '2026-08-02T14-05-09', 'no suffix leaves the id unchanged');
  assert.equal(
    runIdFrom(date, '-claude-code-claude-opus-4-8'),
    '2026-08-02T14-05-09-claude-code-claude-opus-4-8',
  );
});

test('latestPrior with an actor model matches only that model, and never falls back to another', () => {
  const dir = join(tempSuite(), 'history');
  writeRun(dir, record({
    run_id: '2026-08-01T00-00-00-omp-deepseek',
    models_used: { actor: 'opencode-go/deepseek-v4-flash', judge: 'j' },
    judge_reasoning: 'deepseek baseline',
  }));
  writeRun(dir, record({
    run_id: '2026-08-03T00-00-00-claude-code-opus',
    models_used: { actor: 'claude-opus-4-8', judge: 'j' },
    judge_reasoning: 'opus baseline',
  }));

  assert.equal(latestPrior(dir, { actor: 'opencode-go/deepseek-v4-flash' }).judge_reasoning, 'deepseek baseline');
  assert.equal(latestPrior(dir, { actor: 'claude-opus-4-8' }).judge_reasoning, 'opus baseline');
  // A model with no prior of its own gets no baseline at all: a cross-model
  // comparison would report a model difference as a regression.
  assert.equal(latestPrior(dir, { actor: 'kimi-code/k3' }), null);
  // No actor filter keeps the old behavior: the newest record wins.
  assert.equal(latestPrior(dir).judge_reasoning, 'opus baseline');
});

test('renderMarkdown escapes pipes in details', () => {
  const md = renderMarkdown(record({ criteria: [{ id: 'c1', kind: 'semantic', status: 'pass', detail: 'a | b' }] }));
  assert.match(md, /a \\\| b/);
});

test('writeRun with a non-empty logText writes a -log.md beside the entry, sets log_path, returns logPath', () => {
  const dir = join(tempSuite(), 'history');
  const written = writeRun(dir, record(), 'raw LLM output text');
  assert.ok(existsSync(written.logPath), 'the log file exists');
  assert.equal(written.logPath, join(dir, '2026-08-02T10-00-00-log.md'));
  assert.equal(readFileSync(written.logPath, 'utf8'), 'raw LLM output text');
  const doc = JSON.parse(readFileSync(written.jsonPath, 'utf8'));
  assert.equal(doc.log_path, '2026-08-02T10-00-00-log.md');
});

test('collision suffixing covers the log: each log pairs with its own suffixed entry', () => {
  const dir = join(tempSuite(), 'history');
  const first = writeRun(dir, record(), 'first log');
  const second = writeRun(dir, record(), 'second log');
  assert.equal(second.runId, '2026-08-02T10-00-00-2');
  assert.ok(existsSync(first.logPath));
  assert.ok(existsSync(second.logPath));
  assert.equal(second.logPath, join(dir, '2026-08-02T10-00-00-2-log.md'));
  assert.equal(readFileSync(first.logPath, 'utf8'), 'first log');
  assert.equal(readFileSync(second.logPath, 'utf8'), 'second log');
  const firstDoc = JSON.parse(readFileSync(first.jsonPath, 'utf8'));
  const secondDoc = JSON.parse(readFileSync(second.jsonPath, 'utf8'));
  assert.equal(firstDoc.log_path, '2026-08-02T10-00-00-log.md');
  assert.equal(secondDoc.log_path, '2026-08-02T10-00-00-2-log.md');
});

test('writeRun without a logText writes no -log.md and the record carries no log_path', () => {
  const dir = join(tempSuite(), 'history');
  const written = writeRun(dir, record());
  assert.equal(existsSync(join(dir, '2026-08-02T10-00-00-log.md')), false, 'no -log.md file');
  assert.equal('logPath' in written, false);
  const doc = JSON.parse(readFileSync(written.jsonPath, 'utf8'));
  assert.equal('log_path' in doc, false);
});

test('renderMarkdown carries a Log line when the record has log_path, none otherwise', () => {
  const md = renderMarkdown(record({ log_path: '2026-08-02T10-00-00-log.md' }));
  assert.match(md, /- Log: 2026-08-02T10-00-00-log\.md/);
  const plain = renderMarkdown(record());
  assert.doesNotMatch(plain, /- Log:/);
});
