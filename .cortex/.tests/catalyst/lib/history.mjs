// Read the prior run and write a run record (JSON plus a human-readable MD).
// History is kept in full; a prior run is never overwritten. Zero runtime deps,
// Node ESM.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A filesystem-safe run id from a Date: 2026-08-02T14-05-09. An optional
 * suffix names the actor model that produced the run, so a test fanned out
 * across models keeps one record set per model.
 */
export function runIdFrom(date, suffix = '') {
  const base = date.toISOString().replace(/\.\d+Z$/, '').replace(/:/g, '-');
  return `${base}${suffix ?? ''}`;
}

/**
 * The most recent prior run record in `historyDir`, or null when none.
 *
 * With an `actor` model, only a record whose actor model matches is a
 * baseline, and there is no fall-back to another model's run: comparing a
 * deepseek run against an opus one would report a model difference as a
 * regression.
 */
export function latestPrior(historyDir, { actor = null } = {}) {
  if (!existsSync(historyDir)) return null;
  const files = readdirSync(historyDir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  for (let i = files.length - 1; i >= 0; i -= 1) {
    let record;
    try {
      record = JSON.parse(readFileSync(join(historyDir, files[i]), 'utf8'));
    } catch {
      continue;
    }
    if (actor === null || record?.models_used?.actor === actor) return record;
  }
  return null;
}

/** Render the human-readable run markdown from a record. */
export function renderMarkdown(record) {
  const lines = [];
  lines.push(`# Run ${record.run_id}`);
  lines.push('');
  lines.push(`- Timestamp: ${record.timestamp}`);
  lines.push(`- Config source: ${record.config_source} (side: ${record.side})`);
  lines.push(`- Actor model: ${record.models_used.actor}`);
  if (record.models_used.actor_runtime) lines.push(`- Actor harness: ${record.models_used.actor_runtime}`);
  lines.push(`- Judge model: ${record.models_used.judge}`);
  lines.push(`- Duration: ${record.duration_ms} ms`);
  lines.push(`- Errored: ${record.errored ? 'yes' : 'no'}`);
  if (record.launch_error) lines.push(`- Launch error: ${record.launch_error.role} launch exited ${record.launch_error.code}`);
  lines.push(`- Regressions: ${record.regressions.length}`);
  if (record.log_path) lines.push(`- Log: ${record.log_path}`);
  lines.push('');
  lines.push('| criterion | kind | status | detail |');
  lines.push('|---|---|---|---|');
  for (const c of record.criteria) {
    const detail = String(c.detail ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(`| ${c.id} | ${c.kind} | ${c.status} | ${detail} |`);
  }
  lines.push('');
  if (record.launch_error) {
    const e = record.launch_error;
    lines.push('## Launch error');
    lines.push('');
    lines.push(`${e.role} launch exited ${e.code}`);
    lines.push('');
    lines.push('stderr:');
    lines.push('```');
    lines.push(e.stderr || '(none)');
    lines.push('```');
    lines.push('');
    lines.push('stdout tail:');
    lines.push('```');
    lines.push(e.stdout_tail || '(none)');
    lines.push('```');
    lines.push('');
  }
  lines.push('## Judge reasoning');
  lines.push('');
  lines.push(record.judge_reasoning ? record.judge_reasoning : '(no semantic criteria judged)');
  lines.push('');
  return lines.join('\n');
}

/**
 * Write `<run-id>.json` and `<run-id>.md` under `historyDir`, never overwriting
 * a prior run: a colliding id gains a numeric suffix. With a non-empty
 * `logText`, also write `<run-id>-log.md` (the raw LLM output) using the final
 * suffixed id, and carry `log_path` on the record before serializing.
 * @returns {{runId, jsonPath, mdPath, logPath?}}
 */
export function writeRun(historyDir, record, logText) {
  mkdirSync(historyDir, { recursive: true });
  let runId = record.run_id;
  let suffix = 1;
  while (existsSync(join(historyDir, `${runId}.json`))) {
    suffix += 1;
    runId = `${record.run_id}-${suffix}`;
  }
  const finalRecord = { ...record, run_id: runId };
  const jsonPath = join(historyDir, `${runId}.json`);
  const mdPath = join(historyDir, `${runId}.md`);
  const written = { runId, jsonPath, mdPath };
  if (typeof logText === 'string' && logText.length > 0) {
    finalRecord.log_path = `${runId}-log.md`;
    const logPath = join(historyDir, `${runId}-log.md`);
    writeFileSync(logPath, logText);
    written.logPath = logPath;
  }
  writeFileSync(jsonPath, `${JSON.stringify(finalRecord, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(finalRecord));
  return written;
}
