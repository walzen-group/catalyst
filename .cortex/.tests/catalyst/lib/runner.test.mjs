import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { runTest, newTest, main } from './runner.mjs';
import {
  MULTI_TEST_YAML, ROLES, TEST_YAML, tempSuite, writeTestDir, seedPriorRun, fakeInvoker, stepClock,
} from './fixtures.mjs';

function deps(suiteDir, extra = {}) {
  return { suiteDir, roles: ROLES, now: stepClock(), ...extra };
}

test('a clean run records pass verdicts, writes history JSON+MD, updates the README, exits 0', async () => {
  const suite = tempSuite();
  const testDir = writeTestDir(suite, 'guarded-rule');
  const { invoke, calls } = fakeInvoker();

  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, true);
  assert.equal(result.runs.length, 1);

  const run = result.runs[0];
  assert.deepEqual(run.criteria.map((c) => [c.id, c.status]), [['c1', 'pass'], ['c2', 'pass']]);
  assert.ok(existsSync(run.jsonPath));
  assert.ok(existsSync(run.mdPath.replace(/\.md$/, '.json')));

  // The actor launch cwd is the test directory, model is the resolved model, kind unit.
  const actorCall = calls.find((c) => c.meta.role === 'actor');
  assert.equal(actorCall.input.agents[0].cwd, testDir);
  assert.equal(actorCall.input.agents[0].model, 'opencode-go/deepseek-v4-flash');
  assert.equal(actorCall.input.agents[0].kind, 'unit');
  const judgeCall = calls.find((c) => c.meta.role === 'judge');
  assert.equal(judgeCall.input.agents[0].kind, 'unit');
  assert.equal(judgeCall.input.agents[0].model, 'claude-opus-4-8');

  // README last-result cell updated for this slug.
  const readme = readFileSync(join(suite, 'README.md'), 'utf8');
  assert.match(readme, /guarded-rule .* 2\/2 pass/);
});

test('config_source both with differing actor models runs the actor twice', async () => {
  const suite = tempSuite();
  writeTestDir(suite, 'guarded-rule', { testYaml: TEST_YAML.replace('config_source: declared', 'config_source: both') });
  const roles = { ...ROLES, 'implementation-mid': { ...ROLES['implementation-mid'], model: 'opencode-go/deepseek-v5' } };
  const { invoke, calls } = fakeInvoker();

  const result = await runTest('guarded-rule', { suiteDir: suite, roles, now: stepClock(), invoke });
  assert.equal(result.runs.length, 2);
  const actorModels = calls.filter((c) => c.meta.role === 'actor').map((c) => c.input.agents[0].model);
  assert.deepEqual(actorModels, ['opencode-go/deepseek-v4-flash', 'opencode-go/deepseek-v5']);
});

test('an actor models list runs the test once per model, each on its own harness, under one judge', async () => {
  const suite = tempSuite();
  const testDir = writeTestDir(suite, 'guarded-rule', { testYaml: MULTI_TEST_YAML });
  const { invoke, calls } = fakeInvoker();

  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, true);
  assert.equal(result.runs.length, 2, 'one run per actor model');

  const actors = calls.filter((c) => c.meta.role === 'actor').map((c) => c.input.agents[0]);
  assert.deepEqual(actors.map((a) => a.model), ['opencode-go/deepseek-v4-flash', 'sonnet']);
  // The harness per model is the point: the claude-tier model must launch on
  // the claude CLI, never as an omp agent.
  assert.deepEqual(actors.map((a) => a.cli), ['omp', 'claude']);

  const judges = calls.filter((c) => c.meta.role === 'judge').map((c) => c.input.agents[0]);
  assert.deepEqual(judges.map((a) => a.model), ['claude-opus-4-8', 'claude-opus-4-8'], 'one judge model for all runs');

  // Each record is slugged by harness and model, and names the harness it used.
  assert.deepEqual(result.runs.map((r) => r.models_used.actor_runtime), ['omp', 'claude-code']);
  assert.match(result.runs[0].run_id, /-omp-opencode-go-deepseek-v4-flash$/);
  assert.match(result.runs[1].run_id, /-claude-code-sonnet$/);

  const jsons = readdirSync(join(testDir, 'history')).filter((f) => f.endsWith('.json')).sort();
  assert.equal(jsons.length, 2, 'two records, one per model');

  // The README cell names both models rather than only the last run.
  const readme = readFileSync(join(suite, 'README.md'), 'utf8');
  assert.match(readme, /opencode-go\/deepseek-v4-flash: 2\/2 pass/);
  assert.match(readme, /sonnet: 2\/2 pass/);
});

test('a single-model test keeps a bare timestamp run id, so existing history ids do not churn', async () => {
  const suite = tempSuite();
  writeTestDir(suite, 'guarded-rule');
  const { invoke } = fakeInvoker();
  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.match(result.runs[0].run_id, /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
});

test('a baseline matches the same actor model only: another model prior is no baseline', async () => {
  const suite = tempSuite();
  const testDir = writeTestDir(suite, 'guarded-rule', { testYaml: MULTI_TEST_YAML });
  // A passing prior for the deepseek model only. The judge now fails c1 on both
  // runs: only the model that has a prior may report a regression.
  seedPriorRun(testDir, [
    { id: 'c1', kind: 'semantic', status: 'pass', detail: 'ok' },
    { id: 'c2', kind: 'deterministic', status: 'pass', detail: 'ok' },
  ], '2026-08-01T00-00-00-omp-opencode-go-deepseek-v4-flash', 'opencode-go/deepseek-v4-flash');
  const failing = JSON.stringify({ verdicts: { c1: { pass: false, justification: 'no' } }, judge_reasoning: 'regressed' });
  const { invoke } = fakeInvoker({ judge: { code: 0, report: failing } });

  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.deepEqual(result.runs[0].regressions, ['c1'], 'the model with a prior reports the flip');
  assert.deepEqual(result.runs[1].regressions, [], 'the other model has no prior, so nothing to regress from');
});

test('a judge launch failure records an errored run: semantic unverified, deterministic kept, exit non-zero', async () => {
  const suite = tempSuite();
  writeTestDir(suite, 'guarded-rule');
  const { invoke } = fakeInvoker({ judge: { code: 1, report: '', stderr: 'launch failed' } });

  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, false, 'errored run makes the overall result fail');
  const run = result.runs[0];
  assert.equal(run.errored, true);
  assert.equal(run.criteria.find((c) => c.id === 'c1').status, 'unverified');
  assert.equal(run.criteria.find((c) => c.id === 'c2').status, 'pass');

  const code = await main(['run', 'guarded-rule'], deps(suite, { invoke, out: { write() {} } }));
  assert.equal(code, 1);
});

test('malformed judge output is treated as a judge failure (unverified semantic)', async () => {
  const suite = tempSuite();
  writeTestDir(suite, 'guarded-rule');
  const { invoke } = fakeInvoker({ judge: { code: 0, report: '{ not valid json' } });

  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, false);
  assert.equal(result.runs[0].criteria.find((c) => c.id === 'c1').status, 'unverified');
});

test('regression detection flips when a previously-passing criterion now fails, exit non-zero', async () => {
  const suite = tempSuite();
  const testDir = writeTestDir(suite, 'guarded-rule');
  seedPriorRun(testDir, [
    { id: 'c1', kind: 'semantic', status: 'pass', detail: 'ok' },
    { id: 'c2', kind: 'deterministic', status: 'pass', detail: 'ok' },
  ]);
  // The judge now fails c1.
  const failing = JSON.stringify({ verdicts: { c1: { pass: false, justification: 'channel not used' } }, judge_reasoning: 'regressed' });
  const { invoke } = fakeInvoker({ judge: { code: 0, report: failing } });

  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, false);
  assert.deepEqual(result.runs[0].regressions, ['c1']);
});

test('an unverified criterion is not counted as a regression', async () => {
  const suite = tempSuite();
  const testDir = writeTestDir(suite, 'guarded-rule');
  seedPriorRun(testDir, [{ id: 'c1', kind: 'semantic', status: 'pass', detail: 'ok' }]);
  const { invoke } = fakeInvoker({ judge: { code: 1, report: '' } });

  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.deepEqual(result.runs[0].regressions, []);
});

test('the actor cwd is the test dir and the scenario is delivered inline as the brief', async () => {
  const suite = tempSuite();
  const testDir = writeTestDir(suite, 'guarded-rule', { scenario: 'REPLAY THIS EXACT PROMPT' });
  const { invoke, calls } = fakeInvoker();
  await runTest('guarded-rule', deps(suite, { invoke }));
  const actor = calls.find((c) => c.meta.role === 'actor').input.agents[0];
  assert.equal(actor.cwd, testDir);
  assert.equal(actor.brief.mode, 'inline');
  assert.match(actor.brief.text, /REPLAY THIS EXACT PROMPT/);
});

test('the spec mandate_mode reaches the actor and judge dispatch documents', async () => {
  const suite = tempSuite();
  writeTestDir(suite, 'guarded-rule', { testYaml: `${TEST_YAML}mandate_mode: caller_owned\n` });
  const { invoke, calls } = fakeInvoker();
  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, true);
  assert.equal(calls.find((c) => c.meta.role === 'actor').input.mandate_mode, 'caller_owned');
  assert.equal(calls.find((c) => c.meta.role === 'judge').input.mandate_mode, 'caller_owned');
});

test('a first-run failing criterion fails the run and exits non-zero', async () => {
  const suite = tempSuite();
  const checks = `export function alwaysFail(ctx) {
    return { criterion: 'c2', pass: false, detail: 'the assertion fired' };
  }`;
  writeTestDir(suite, 'guarded-rule', { checks });
  const { invoke } = fakeInvoker();
  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, false, 'a failing criterion fails the run even with no prior baseline');
  assert.equal(result.runs[0].criteria.find((c) => c.id === 'c2').status, 'fail');

  const code = await main(['run', 'guarded-rule'], deps(suite, { invoke, out: { write() {} } }));
  assert.equal(code, 1, 'the CLI exits non-zero on the failing run');
});

test('the dispatch result brief_text_delivered reaches the deterministic check context', async () => {
  const suite = tempSuite();
  const checks = `export function seen(ctx) {
    const ok = ctx.deliveredText === 'THE DELIVERED BRIEF';
    return { criterion: 'c2', pass: ok, detail: 'ctx.deliveredText=' + ctx.deliveredText };
  }`;
  writeTestDir(suite, 'guarded-rule', { checks });
  const { invoke } = fakeInvoker({
    actor: {
      code: 0,
      report: 'ACTOR FINAL REPORT: delegate channel used.',
      transcript: 'CANNED ACTOR TRANSCRIPT: routed the reply through the delegate channel.',
      stdout: JSON.stringify({ status: 'ok', agents: [{ name: 'guarded-rule-actor', brief_text_delivered: 'THE DELIVERED BRIEF' }] }),
    },
  });
  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, true);
  assert.equal(result.runs[0].criteria.find((c) => c.id === 'c2').status, 'pass');
});

test('a long slug yields actor/judge launch names that are <=32 chars and distinct', async () => {
  const suite = tempSuite();
  // herdr rejects agent names over 32 chars. This 27-char slug makes the naive
  // `${slug}-actor`/`${slug}-judge` 33 chars, which fails the live launch.
  const slug = 'qcdispatch-delegate-channel';
  writeTestDir(suite, slug);
  const { invoke, calls } = fakeInvoker();

  await runTest(slug, deps(suite, { invoke }));

  const actorName = calls.find((c) => c.meta.role === 'actor').input.agents[0].name;
  const judgeName = calls.find((c) => c.meta.role === 'judge').input.agents[0].name;
  assert.ok(actorName.length <= 32, `actor name "${actorName}" is ${actorName.length} chars`);
  assert.ok(judgeName.length <= 32, `judge name "${judgeName}" is ${judgeName.length} chars`);
  assert.notEqual(actorName, judgeName, 'actor and judge names must be distinct');
});

test('a run against a judge that equals the actor is refused before any launch', async () => {
  const suite = tempSuite();
  // Judge model collides with the actor model on the declared side (test.yaml).
  writeTestDir(suite, 'guarded-rule', {
    testYaml: TEST_YAML.replace('  model: claude-opus-4-8', '  model: opencode-go/deepseek-v4-flash'),
  });
  const { invoke, calls } = fakeInvoker();

  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, false);
  assert.equal(result.refused, true);
  assert.equal(calls.length, 0, 'nothing launched on refusal');
});

test('new <slug> scaffolds a skeleton and refuses an existing slug', async () => {
  const suite = tempSuite();
  const { created } = newTest('fresh-rule', { suiteDir: suite });
  assert.ok(created.length >= 3);
  assert.ok(existsSync(join(suite, 'fresh-rule', 'test.yaml')));

  const code = await main(['new', 'fresh-rule'], { suiteDir: suite, out: { write() {} } });
  assert.equal(code, 1, 'a second scaffold of the same slug fails');
});

test('history is kept in full: a second run adds a record without removing the first', async () => {
  const suite = tempSuite();
  const testDir = writeTestDir(suite, 'guarded-rule');
  const { invoke } = fakeInvoker();
  await runTest('guarded-rule', deps(suite, { invoke }));
  await runTest('guarded-rule', deps(suite, { invoke }));
  const jsons = readdirSync(join(testDir, 'history')).filter((f) => f.endsWith('.json'));
  assert.equal(jsons.length, 2);
});

test('run of an unknown slug is refused with a clear message', async () => {
  const suite = tempSuite();
  const result = await runTest('nope', { suiteDir: suite, roles: ROLES });
  assert.equal(result.refused, true);
  assert.match(result.errors[0], /no test "nope"/);
});

test('a clean run writes a per-run -log.md holding the actor transcript and judge report verbatim, log_path on the record, Log line in the md', async () => {
  const suite = tempSuite();
  writeTestDir(suite, 'guarded-rule');
  const { invoke } = fakeInvoker({
    actor: { code: 0, report: 'ACTOR FINAL REPORT: delegate channel used.', transcript: 'CANNED ACTOR TRANSCRIPT: routed the reply through the delegate channel.' },
  });

  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, true);
  const run = result.runs[0];
  const logPath = run.jsonPath.replace(/\.json$/, '-log.md');
  assert.ok(existsSync(logPath), 'a third file, the -log.md, is written per run');

  const log = readFileSync(logPath, 'utf8');
  assert.match(log, /## Actor output/);
  assert.match(log, /## Judge output/);
  assert.ok(log.indexOf('## Actor output') < log.indexOf('## Judge output'), 'actor section precedes the judge section');
  assert.match(log, /CANNED ACTOR TRANSCRIPT: routed the reply through the delegate channel\./);
  assert.match(log, /routed via the delegate channel/, 'the canned judge report text is in the log');

  const doc = JSON.parse(readFileSync(run.jsonPath, 'utf8'));
  assert.equal(doc.log_path, `${run.run_id}-log.md`);
  const md = readFileSync(run.mdPath, 'utf8');
  assert.match(md, /- Log: .*-log\.md/);
});

test('an errored judge run still writes the log: canned actor transcript and the judge failure marker', async () => {
  const suite = tempSuite();
  writeTestDir(suite, 'guarded-rule');
  const { invoke } = fakeInvoker({
    actor: { code: 0, report: 'ACTOR FINAL REPORT: delegate channel used.', transcript: 'CANNED ACTOR TRANSCRIPT: routed the reply through the delegate channel.' },
    judge: { code: 1, report: '', stderr: 'launch failed' },
  });

  const result = await runTest('guarded-rule', deps(suite, { invoke }));
  assert.equal(result.ok, false, 'errored run makes the overall result fail');
  const run = result.runs[0];
  assert.equal(run.errored, true);
  const logPath = run.jsonPath.replace(/\.json$/, '-log.md');
  assert.ok(existsSync(logPath), 'the log is written for an errored run too');

  const log = readFileSync(logPath, 'utf8');
  assert.match(log, /## Actor output/);
  assert.match(log, /CANNED ACTOR TRANSCRIPT: routed the reply through the delegate channel\./);
  assert.match(log, /\(judge launch failed or produced no report\)/);
});
