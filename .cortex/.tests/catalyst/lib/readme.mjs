// Rewrite the suite README's last-result cell for one rule-slug after a run. The
// index is a Markdown table with columns: test, what it guards, source incident,
// last result. This updater owns only the last-result cell; the other columns
// are authored elsewhere. Zero runtime deps, Node ESM.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const HEADER = '| test | what it guards | source incident | last result |';
const SEPARATOR = '|---|---|---|---|';

/** The last-result cell text: "4/4 pass (2026-08-02, <run-id>)". */
export function formatLastResult({ pass, total, date, runId }) {
  return `${pass}/${total} pass (${date}, ${runId})`;
}

/**
 * The last-result cell for a test run across several actor models: one
 * `<model>: 4/4 pass (date, run-id)` segment per run, joined by "; ". A single
 * run renders as the plain cell, so a single-model test's row keeps the shape
 * it has always had.
 */
export function formatMultiResult(entries) {
  if (entries.length === 1) return formatLastResult(entries[0]);
  return entries.map((entry) => `${entry.model}: ${formatLastResult(entry)}`).join('; ');
}

// Split a table row "| a | b | c |" into its trimmed data cells.
function rowCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return null;
  const inner = trimmed.replace(/^\|/, '').replace(/\|\s*$/, '');
  return inner.split('|').map((cell) => cell.trim());
}

function buildRow(cells) {
  return `| ${cells.join(' | ')} |`;
}

/**
 * Rewrite the last-result cell of the `slug` row, or append a row when none
 * exists. Creates the file with a header when it is absent.
 * @returns {{appended: boolean}}
 */
export function updateReadme(readmePath, slug, lastResult) {
  let text;
  if (existsSync(readmePath)) {
    text = readFileSync(readmePath, 'utf8');
  } else {
    text = `# Catalyst integration tests\n\n${HEADER}\n${SEPARATOR}\n`;
  }

  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  let appended = true;

  for (let i = 0; i < lines.length; i += 1) {
    const cells = rowCells(lines[i]);
    if (!cells || cells.length < 4) continue;
    if (cells[0] !== slug) continue;
    cells[cells.length - 1] = lastResult;
    lines[i] = buildRow(cells);
    appended = false;
    break;
  }

  if (appended) {
    // Append after the last existing table row so the row lands inside the table.
    let lastRow = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (rowCells(lines[i])) lastRow = i;
    }
    const row = buildRow([slug, '', '', lastResult]);
    if (lastRow === -1) {
      lines.push(HEADER, SEPARATOR, row);
    } else {
      lines.splice(lastRow + 1, 0, row);
    }
  }

  writeFileSync(readmePath, lines.join(eol));
  return { appended };
}
