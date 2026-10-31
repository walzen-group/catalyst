// Deterministic checks for the claude-composer-title-border guard. Each export
// receives the run context { testDir, actorReport, transcript, coveredFiles,
// isolation, spec } and returns { criterion, pass, detail }. The criterion
// string matches a deterministic criterion id in test.yaml. Zero runtime deps,
// Node ESM.
//
// These checks exercise live behavior and context: the dispatch pins run
// against the installed tool, the built launch documents are read from the live
// spec and role table, and the report-schema check validates the recorded run.
// No check asserts source text, a predicate name, the README, or a fixture's
// contents by search.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const kitRoot = (ctx) => join(ctx.testDir, '..', '..', '..', '..');
const dispatchDir = (ctx) => join(kitRoot(ctx), 'skills', 'catalyst-v2-dispatch');
const libDir = (ctx) => join(ctx.testDir, '..', 'lib');
const live = (path) => import(pathToFileURL(path).href);

// The behavioral cases this guard exists for: the titled border is read, the
// titled empty composer takes the send, and a real draft still refuses.

// The specific records and directories this replay must not read. Generic
// `.cortex/...` prefixes are not used: the live catalyst skills mention those
// directory names in their own text, and a loaded skill is an allowed source
// (runs 2026-10-31T15-49-47 and 15-52-10 hit the generic pattern on the
// incident slug and on catalyst-v2-writing-docs).
const FORBIDDEN_SOURCES =
  /\.cortex\/incidents\/2026-10-31-c2d-claude-composer-title-border|\.cortex\/plans\/2026-10-31-nyx-keeper-delivery|\.cortex\/reports\/handbacks\/2026-10-31-|claude-composer-title-border\/history\//;

// Criterion unit-pins-pass runs the focused dispatch behavior suite in the
// installed tool directory.
export function unitPinsPass(ctx) {
  const dir = dispatchDir(ctx);
  let output = '';
  try {
    output = execFileSync('node', ['--test', 'test/screens.test.mjs', 'test/deliver.test.mjs'], {
      cwd: dir,
      encoding: 'utf8',
    });
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : '';
    return {
      criterion: 'unit-pins-pass',
      pass: false,
      detail: `node --test in ${dir} failed: ${stderr.split('\n')[0] ?? error.message}`,
    };
  }
  const tests = Number(/tests (\d+)/.exec(output)?.[1] ?? NaN);
  const pass = Number(/pass (\d+)/.exec(output)?.[1] ?? NaN);
  const fail = Number(/fail (\d+)/.exec(output)?.[1] ?? NaN);
  const ok = Number.isFinite(tests) && pass === tests && fail === 0;
  return {
    criterion: 'unit-pins-pass',
    pass: ok,
    detail: ok
      ? `${tests} tests, ${pass} pass, ${fail} fail`
      : `suite result: tests=${Number.isFinite(tests) ? tests : 'unparsed'}, pass=${pass}, fail=${fail}`,
  };
}

// Criterion report-schema: the newest recorded run JSON matches the record
// schema the runner reads back for regression comparison. The runner executes
// checks before writing the record for the current run, and this test's first
// replay is its first record, so an empty history passes and the check starts
// guarding schema drift from the second run on.
export function reportSchema(ctx) {
  const historyDir = join(ctx.testDir, 'history');
  let jsonPath = null;
  let record = null;
  let erroredSkipped = 0;
  let sawAny = false;
  if (existsSync(historyDir)) {
    const files = readdirSync(historyDir).filter((name) => name.endsWith('.json')).sort().reverse();
    for (const name of files) {
      sawAny = true;
      const candidate = join(historyDir, name);
      let parsed = null;
      try {
        parsed = JSON.parse(readFileSync(candidate, 'utf8'));
      } catch {
        // A malformed newest record is schema drift; fail on it.
        jsonPath = candidate;
        record = null;
        break;
      }
      // An errored run has no judge report by design. It stays in history and
      // is named in the detail, but the schema applies to a completed run.
      if (parsed?.errored === true) {
        erroredSkipped += 1;
        continue;
      }
      jsonPath = candidate;
      record = parsed;
      break;
    }
  }
  if (!jsonPath) {
    return {
      criterion: 'report-schema',
      pass: true,
      detail: sawAny
        ? `${erroredSkipped} recorded run(s) are errored; no completed run exists yet, so the schema check waits`
        : 'no prior run recorded; the check guards the schema from the next completed run',
    };
  }
  const problems = [];
  if (record === null) problems.push('newest completed run JSON does not parse');
  if (record) {
    const criteriaOk = Array.isArray(record.criteria) && record.criteria.length > 0
      && record.criteria.every((c) => typeof c.id === 'string' && typeof c.status === 'string');
    if (!criteriaOk) problems.push('criteria missing or entries lack id/status');
    if (!record.models_used || typeof record.models_used.actor !== 'string'
      || typeof record.models_used.judge !== 'string') {
      problems.push('models_used.actor or models_used.judge missing');
    }
    if (typeof record.duration_ms !== 'number') problems.push('duration_ms missing');
    if (typeof record.judge_reasoning !== 'string') problems.push('judge_reasoning missing');
  }
  return {
    criterion: 'report-schema',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? (erroredSkipped > 0
        ? 'newest recorded run is errored; the newest completed run JSON matches the record schema'
        : 'newest recorded run JSON matches the record schema')
      : problems.join('; '),
  };
}

// Criterion dispatch-pairing: this spec resolves without a collision because it
// declares distinct_by: isolation, and both built launch documents run on omp
// with thinking max and the DeepSeek Flash model.
export async function dispatchPairing(ctx) {
  try {
    const testspec = await live(join(libDir(ctx), 'testspec.mjs'));
    const config = await live(join(libDir(ctx), 'config.mjs'));
    const resolver = await live(join(libDir(ctx), 'resolve.mjs'));
    const dispatch = await live(join(libDir(ctx), 'dispatch.mjs'));

    const spec = testspec.loadTestSpec(ctx.testDir, 'claude-composer-title-border');
    const roles = config.loadRoles();
    const resolved = resolver.resolveRuns(spec, roles);
    if (!resolved.ok) {
      return { criterion: 'dispatch-pairing', pass: false, detail: `spec refused: ${resolved.errors.join('; ')}` };
    }

    const problems = [];
    if (resolved.runs.length !== 1) problems.push(`expected one run, got ${resolved.runs.length}`);
    for (const run of resolved.runs) {
      const actor = dispatch.buildDispatchInput({
        dispatchId: 'guard-titled-actor',
        name: 'titled-actor',
        cwd: ctx.testDir,
        model: run.actorModel,
        roleEntry: { ...roles[spec.actor.role], runtime: run.actorRuntime },
        briefText: 'guard',
      }).agents[0];
      const judge = dispatch.buildDispatchInput({
        dispatchId: 'guard-titled-judge',
        name: 'titled-judge',
        cwd: ctx.testDir,
        model: run.judgeModel,
        roleEntry: roles[spec.judge.role],
        briefText: 'guard',
      }).agents[0];

      const expect = (label, agent) => {
        if (agent.cli !== 'omp') problems.push(`${label} cli=${agent.cli}`);
        if (agent.thinking !== 'max') problems.push(`${label} thinking=${agent.thinking}`);
        if (agent.model !== 'opencode-go/deepseek-v4.1-flash') problems.push(`${label} model=${agent.model}`);
      };
      expect('actor', actor);
      expect('judge', judge);
      if (actor.model !== judge.model) problems.push('the guard spec no longer exercises the shared-id isolation');
      if (spec.judge.distinct_by !== 'isolation') problems.push('the spec does not declare distinct_by: isolation');
    }

    return {
      criterion: 'dispatch-pairing',
      pass: problems.length === 0,
      detail: problems.length === 0
        ? 'both launch documents run omp at thinking max on the DeepSeek Flash model under distinct_by: isolation'
        : problems.join('; '),
    };
  } catch (error) {
    return { criterion: 'dispatch-pairing', pass: false, detail: error.message };
  }
}

// Criterion no-contamination: fail when the actor cites a forbidden source
// path. Naming the incident from the live SKILL.md upgrade note is allowed.
export function contaminationScan(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const match = FORBIDDEN_SOURCES.exec(text);
  return {
    criterion: 'no-contamination',
    pass: match === null,
    detail: match === null ? 'no forbidden sources cited' : `cites forbidden source: ${match[0]}`,
  };
}
