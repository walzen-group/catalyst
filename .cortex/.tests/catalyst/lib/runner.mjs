// Shared runner for the catalyst integration-test suite. Two verbs: `run
// <rule-slug>` drives a test end to end (resolve config, launch actor(s) and the
// judge through the c2d CLI, run deterministic checks, aggregate, record, update
// the README); `new <slug>` scaffolds a test skeleton. Zero runtime deps, Node
// ESM, launches only through the c2d CLI. The dispatch invoker is injectable for
// the unit suite so tests burn no live agent.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadRoles } from './config.mjs';
import { loadTestSpec, semanticCriteria, deterministicCriteria } from './testspec.mjs';
import { resolveRuns } from './resolve.mjs';
import { buildDispatchInput, deliveredBriefText, makeRealInvoker, DEFAULT_HEARTBEAT_MS } from './dispatch.mjs';
import { buildJudgePrompt, parseJudgeReport, validateJudgeOutput } from './judge.mjs';
import { runDeterministicChecks } from './deterministic.mjs';
import { aggregate, detectRegressions, passCount, FAIL, UNVERIFIED } from './verdict.mjs';
import { latestPrior, writeRun, runIdFrom } from './history.mjs';
import { updateReadme, formatMultiResult } from './readme.mjs';
import { scaffold } from './scaffold.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SUITE_DIR = resolve(HERE, '..');

// herdr rejects agent names longer than 32 chars. Truncate the slug portion so
// `<slug>-actor`/`<slug>-judge` fit; the distinct suffixes keep the two names
// apart even after truncation.
const MAX_AGENT_NAME = 32;
export function agentName(slug, suffix) {
  const tail = `-${suffix}`;
  return `${slug.slice(0, MAX_AGENT_NAME - tail.length)}${tail}`;
}

const USAGE = `runner.mjs — catalyst integration-test runner

Usage:
  node lib/runner.mjs run <rule-slug>   run a test, record the result, update the README
  node lib/runner.mjs new <slug>        scaffold a new test skeleton

run launches the actor and judge through the c2d CLI. new refuses an existing slug.
`;

function judgeOutcome(judgeRes, semantic) {
  if (judgeRes.code !== 0) return { errored: true };
  const parsed = parseJudgeReport(judgeRes.report ?? '');
  if (!parsed.ok) return { errored: true };
  const validated = validateJudgeOutput(parsed.value, semantic);
  if (!validated.ok) return { errored: true };
  return { errored: false, verdicts: validated.verdicts, judge_reasoning: validated.judge_reasoning };
}

/**
 * Run one test end to end.
 * @returns {{ok, refused?, errors?, runs}}
 */
export async function runTest(slug, deps = {}) {
  const suiteDir = deps.suiteDir ?? SUITE_DIR;
  const testDir = join(suiteDir, slug);
  if (!existsSync(join(testDir, 'test.yaml'))) {
    return { ok: false, refused: true, errors: [`no test "${slug}" at ${testDir}`], runs: [] };
  }

  const spec = loadTestSpec(testDir, slug);
  const roles = deps.roles ?? loadRoles();
  const resolved = resolveRuns(spec, roles);
  if (!resolved.ok) return { ok: false, refused: true, errors: resolved.errors, runs: [] };

  const scenarioText = readFileSync(join(testDir, 'scenario.md'), 'utf8');
  const invoke = deps.invoke ?? makeRealInvoker();
  const now = deps.now ?? (() => Date.now());
  const heartbeatMs = deps.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const historyDir = join(testDir, 'history');
  const semantic = semanticCriteria(spec);
  const deterministic = deterministicCriteria(spec);

  // One baseline per actor model, all captured before any write, so a later
  // run in this invocation never compares against an earlier one, and each
  // model compares only against its own prior.
  const baselines = new Map();
  for (const run of resolved.runs) {
    if (!baselines.has(run.actorModel)) {
      baselines.set(run.actorModel, latestPrior(historyDir, { actor: run.actorModel }));
    }
  }
  const runs = [];
  const readmeEntries = [];
  let failing = false;

  for (const run of resolved.runs) {
    const started = now();
    const baseline = baselines.get(run.actorModel) ?? null;
    // The role supplies the capability flags; the run supplies the harness that
    // launches this model. claude-opus-4-8 launched as an omp agent dies on a
    // provider 401, so the per-model harness is what makes the fan-out work.
    const actorRoleEntry = { ...roles[spec.actor.role], runtime: run.actorRuntime };
    const actorInput = buildDispatchInput({
      dispatchId: `test-${slug}-${run.side}${run.idSuffix}-actor`,
      name: agentName(slug, 'actor'),
      cwd: testDir,
      model: run.actorModel,
      roleEntry: actorRoleEntry,
      briefText: scenarioText,
      heartbeatMs,
      mandateMode: spec.mandate_mode,
    });
    const actorRes = await invoke(actorInput, { role: 'actor', side: run.side, slug });

    let errored = false;
    let judgeReasoning = null;
    let judgeRes = null;
    let judgeErrored = false;
    let current;

    if (actorRes.code !== 0) {
      errored = true;
      current = spec.criteria.map((c) => ({
        id: c.id,
        kind: c.kind,
        status: UNVERIFIED,
        detail: 'actor launch failed; criterion left unverified',
      }));
    } else {
      const actorReport = actorRes.report ?? '';
      const transcript = actorRes.transcript ?? actorRes.report ?? '';
      let checkResults = [];
      if (deterministic.length > 0) {
        checkResults = await runDeterministicChecks(testDir, {
          testDir,
          actorReport,
          transcript,
          coveredFiles: spec.covered_files,
          isolation: spec.isolation,
          spec,
          deliveredText: deliveredBriefText(actorRes.stdout, agentName(slug, 'actor')),
        });
      }

      let judge = null;
      if (semantic.length > 0) {
        const judgeInput = buildDispatchInput({
          dispatchId: `test-${slug}-${run.side}${run.idSuffix}-judge`,
          name: agentName(slug, 'judge'),
          cwd: testDir,
          model: run.judgeModel,
          roleEntry: roles[spec.judge.role],
          briefText: buildJudgePrompt({ semanticCriteria: semantic, isolation: spec.isolation, actorReport, transcript }),
          heartbeatMs,
          mandateMode: spec.mandate_mode,
        });
        judgeRes = await invoke(judgeInput, { role: 'judge', side: run.side, slug });
        judge = judgeOutcome(judgeRes, semantic);
        judgeErrored = judge.errored;
        if (judge.errored) errored = true;
        else judgeReasoning = judge.judge_reasoning;
      }
      current = aggregate({ criteria: spec.criteria, checkResults, judge });
    }

    const regressions = detectRegressions(current, baseline?.criteria ?? null);
    const finished = now();
    const record = {
      run_id: deps.runId ? deps.runId(run) : runIdFrom(new Date(started), run.idSuffix),
      timestamp: new Date(started).toISOString(),
      config_source: spec.config_source,
      side: run.side,
      models_used: { actor: run.actorModel, actor_runtime: run.actorRuntime, judge: run.judgeModel },
      duration_ms: finished - started,
      criteria: current,
      judge_reasoning: judgeReasoning,
      regressions,
      errored,
    };

    // The per-run raw LLM output log, pinned shape: header, side and models,
    // then the verbatim actor transcript and judge report under fixed section
    // headers, with marker lines where nothing was captured.
    const actorText = actorRes.transcript ?? actorRes.report ?? '';
    let judgeOutput;
    if (semantic.length === 0) {
      judgeOutput = '(no judge run: no semantic criteria)';
    } else if (judgeErrored || !judgeRes) {
      judgeOutput = '(judge launch failed or produced no report)';
    } else {
      judgeOutput = judgeRes.report;
    }
    const logText = [
      `# Run ${record.run_id} - raw LLM output`,
      '',
      `- Side: ${record.side}`,
      `- Actor model: ${record.models_used.actor}`,
      `- Actor harness: ${record.models_used.actor_runtime}`,
      `- Judge model: ${record.models_used.judge}`,
      '',
      '## Actor output',
      actorText || '(no actor output captured)',
      '',
      '## Judge output',
      judgeOutput,
      '',
    ].join('\n');
    const written = writeRun(historyDir, record, logText);

    // The cell is rewritten from every run so far, so a fanned-out test lands
    // one segment per actor model and a single-model test keeps its plain cell.
    readmeEntries.push({
      model: run.actorModel,
      pass: passCount(current),
      total: current.length,
      date: new Date(started).toISOString().slice(0, 10),
      runId: written.runId,
    });
    updateReadme(join(suiteDir, 'README.md'), slug, formatMultiResult(readmeEntries));

    runs.push({ ...record, run_id: written.runId, jsonPath: written.jsonPath, mdPath: written.mdPath });
    // A run fails on an error, on a regression, or on any failing criterion:
    // a first run's failing assertions are the red evidence of a broken
    // behavior and must not exit green.
    if (errored || regressions.length > 0 || current.some((c) => c.status === FAIL)) failing = true;
  }

  return { ok: !failing, runs };
}

/** Scaffold a new test skeleton. */
export function newTest(slug, deps = {}) {
  const suiteDir = deps.suiteDir ?? SUITE_DIR;
  return scaffold(suiteDir, slug);
}

function summarize(out, result) {
  if (result.refused) {
    for (const e of result.errors ?? []) out.write(`refused: ${e}\n`);
    return;
  }
  for (const run of result.runs) {
    const pass = passCount(run.criteria);
    const flags = [];
    if (run.errored) flags.push('ERRORED');
    if (run.regressions.length > 0) flags.push(`regressions: ${run.regressions.length}`);
    const failed = run.criteria.filter((c) => c.status === FAIL).map((c) => c.id);
    if (failed.length > 0) flags.push(`failures: ${failed.join(', ')}`);
    const suffix = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
    out.write(`${run.run_id} (${run.side}, ${run.models_used.actor} via ${run.models_used.actor_runtime}): ${pass}/${run.criteria.length} pass${suffix}\n`);
  }
}

export async function main(argv, deps = {}) {
  const out = deps.out ?? process.stdout;
  const [verb, slug] = argv;

  if (verb === undefined || verb === '--help' || verb === '-h') {
    out.write(USAGE);
    return verb === undefined ? 1 : 0;
  }

  if (verb === 'run') {
    if (!slug) { out.write('run: a rule-slug is required\n'); return 1; }
    const result = await runTest(slug, deps);
    summarize(out, result);
    return result.ok ? 0 : 1;
  }

  if (verb === 'new') {
    if (!slug) { out.write('new: a slug is required\n'); return 1; }
    try {
      const { created } = newTest(slug, deps);
      out.write(`scaffolded ${slug}:\n`);
      for (const path of created) out.write(`  ${path}\n`);
      return 0;
    } catch (error) {
      out.write(`new: ${error.message}\n`);
      return 1;
    }
  }

  out.write(`${verb}: unknown verb\n\n${USAGE}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
