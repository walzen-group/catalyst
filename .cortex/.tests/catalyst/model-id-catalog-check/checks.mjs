// Deterministic checks for the model-id-catalog-check test. Each exported
// function receives the run context { testDir, actorReport, transcript,
// coveredFiles, isolation, spec } and returns { criterion, pass, detail }.
// The criterion string must match a deterministic criterion id in test.yaml.
// Zero runtime deps, Node ESM.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseModelsYaml } from '../lib/config.mjs';
import { parseYaml } from '../lib/yaml.mjs';

const KIT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

const C2D = join(KIT_ROOT, 'skills', 'catalyst-v2-dispatch', 'c2d');
const DASH_ID = 'opencode-go/deepseek-v4-1-flash';
const CATALOG_ID = 'opencode-go/deepseek-v4.1-flash';

const MODEL_PICKING = join(KIT_ROOT, 'skills', 'catalyst-v2-model-picking');
const SKILL_PAGES = [
  join(MODEL_PICKING, 'SKILL.md'),
  join(KIT_ROOT, 'skills', 'catalyst-v2-quickchat', 'SKILL.md'),
];

function trackedFiles(...pathspecs) {
  const out = execFileSync('git', ['-C', KIT_ROOT, 'ls-files', '--', ...pathspecs], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return out.split('\n').filter((line) => line.trim() !== '');
}

/** The selectors `omp models --json` publishes, e.g. opencode-go/deepseek-v4.1-flash. */
function catalogSelectors() {
  const out = execFileSync('omp', ['models', '--json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const doc = JSON.parse(out);
  const models = Array.isArray(doc?.models) ? doc.models : [];
  return new Set(models.map((entry) => entry?.selector).filter((value) => typeof value === 'string'));
}

/** The omp model strings models.yaml declares. */
function modelsYamlModels() {
  const path = join(MODEL_PICKING, 'models.yaml');
  const roles = parseModelsYaml(readFileSync(path, 'utf8'), path);
  return Object.values(roles).map((role) => role.model);
}

/** `opencode-go/<id>` tokens in a text, without trailing punctuation. */
function opencodeTokens(text) {
  return [...text.matchAll(/opencode-go\/[A-Za-z0-9._-]+/g)].map((match) => match[0]);
}

/** Strip a `<harness>:` prefix from a test.yaml model entry. */
function bareModel(entry) {
  return String(entry).replace(/^(omp|claude-code):/, '').trim();
}

/** Every model string a test.yaml declares for its actor or judge. */
function specModels(doc) {
  const models = [];
  const actor = doc?.actor;
  if (typeof actor?.model === 'string') models.push(actor.model);
  const listed = actor?.models;
  if (Array.isArray(listed)) {
    for (const entry of listed) models.push(entry);
  } else if (typeof listed === 'string' && listed.trim().startsWith('[')) {
    const inner = listed.trim().slice(1, -1);
    for (const entry of inner.split(',')) {
      if (entry.trim() !== '') models.push(entry);
    }
  }
  if (typeof doc?.judge?.model === 'string') models.push(doc.judge.model);
  return models.map(bareModel);
}

// Criterion catalog-ids-resolve: every live opencode-go id is a catalog
// selector, and the skill pages only name models models.yaml declares.
export function catalogIdsResolve() {
  const problems = [];
  let selectors;
  try {
    selectors = catalogSelectors();
  } catch (error) {
    return {
      criterion: 'catalog-ids-resolve',
      pass: false,
      detail: `omp models --json failed: ${error.message}`,
    };
  }

  const declared = modelsYamlModels();
  const declaredOpenCode = new Set(declared.filter((model) => model.startsWith('opencode-go/')));

  for (const model of declaredOpenCode) {
    if (!selectors.has(model)) problems.push(`models.yaml names ${model}, not in the catalog`);
  }

  const configText = readFileSync(join(KIT_ROOT, 'omp', 'agent', 'config.yml'), 'utf8');
  const roleLine = /^\s{2}(\w+):\s+(opencode-go\/[^\s:]+)(?::\w+)?$/gm;
  for (const match of configText.matchAll(roleLine)) {
    const model = match[2];
    if (!selectors.has(model)) problems.push(`config.yml role ${match[1]} names ${model}, not in the catalog`);
  }

  for (const page of SKILL_PAGES) {
    const text = readFileSync(page, 'utf8');
    for (const token of opencodeTokens(text)) {
      if (!declaredOpenCode.has(token)) {
        problems.push(`${page.split('/').at(-2)}/SKILL.md names ${token}, not in models.yaml`);
      }
    }
  }

  for (const rel of trackedFiles('.cortex/.tests/catalyst')) {
    if (!rel.endsWith('/test.yaml')) continue;
    const doc = parseYaml(readFileSync(join(KIT_ROOT, rel), 'utf8'), rel);
    for (const model of specModels(doc)) {
      if (!model.startsWith('opencode-go/')) continue;
      if (!selectors.has(model)) problems.push(`${rel} names ${model}, not in the catalog`);
    }
  }

  return {
    criterion: 'catalog-ids-resolve',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? `${declaredOpenCode.size} models.yaml ids, config.yml roles, skill pages, and tracked test specs all resolve`
      : problems.join('; '),
  };
}

// Criterion no-dash-spelling: the dash spelling that no catalog entry lists
// does not survive anywhere in the live instruction, config, or test tree. A
// generated slug (`...-opencode-go-deepseek-v4-1-flash`) is excluded: slugify
// turns the catalog id's dot into a hyphen, so the slug is expected to carry
// the dash form.
export function noDashSpelling() {
  const bad = /(?<!opencode-go-)deepseek-v4-1-flash/;
  const hits = [];
  for (const rel of trackedFiles('skills', 'omp', '.cortex/.tests/catalyst')) {
    if (rel.includes('/history/')) continue;
    // This test names the bad token to guard against it; its own files are exempt.
    if (rel.startsWith('.cortex/.tests/catalyst/model-id-catalog-check/')) continue;
    // The dispatch preflight test names the bad token as a refusal fixture:
    // preflight must reject it and echo it with the nearest catalog id.
    if (rel === 'skills/catalyst-v2-dispatch/test/preflight.test.mjs') continue;
    if (!/\.(md|mjs|yaml|yml|json)$/.test(rel)) continue;
    const lines = readFileSync(join(KIT_ROOT, rel), 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      if (bad.test(line)) hits.push(`${rel}:${index + 1}`);
    }
  }
  return {
    criterion: 'no-dash-spelling',
    pass: hits.length === 0,
    detail: hits.length === 0
      ? 'no live tracked file names the dash-spelled model id'
      : `stale spelling at ${hits.join(', ')}`,
  };
}

// Criterion no-contamination: fail when the actor cites a forbidden source.
// The isolation rules forbid this incident, any dated plan path, and this
// test's own history. A different incident or a handback is allowed; the
// scenario itself names `.cortex/plans` as a directory to avoid, so only a
// dated plan path counts as a citation.
export function contaminationScan(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const match = /2026-10-28-model-id-hyphen-drift|model-id-catalog-check\/history\/|\.cortex\/plans\/\d{4}-\d{2}-\d{2}/.exec(text);
  return {
    criterion: 'no-contamination',
    pass: match === null,
    detail: match === null ? 'no forbidden sources cited' : `cites forbidden source: ${match[0]}`,
  };
}

/** Run one dry-run dispatch of a unit agent on a model string; return its JSON
 * document whatever the exit code. A refusal is reported as status "failed". */
function dryRun(model) {
  const input = {
    dispatch_id: `model-id-catalog-check-${model === DASH_ID ? 'dash' : 'catalog'}`,
    heartbeat_ms: 900000,
    agents: [{
      name: 'model-id-catalog-check-dry',
      kind: 'unit',
      cli: 'omp',
      cwd: KIT_ROOT,
      model,
      thinking: 'max',
      brief: { mode: 'inline', text: 'dry-run preflight check; launch nothing' },
    }],
  };
  const options = {
    input: JSON.stringify(input),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  };
  try {
    return JSON.parse(execFileSync(C2D, ['dispatch', '--dry-run'], options));
  } catch (error) {
    if (typeof error?.stdout === 'string' && error.stdout.trim() !== '') {
      return JSON.parse(error.stdout);
    }
    throw error;
  }
}

// Criterion preflight-refuses-dash: the live dispatch preflight refuses the
// hyphen spelling through the real CLI and names the nearest catalog selector,
// while the catalog id itself still returns a launch plan. This is the
// behavior the incident's fix added; before it, both strings produced a plan.
export function preflightRefusesDash() {
  try {
    const refused = dryRun(DASH_ID);
    const plan = dryRun(CATALOG_ID);
    const problems = [];
    if (refused.status !== 'failed') {
      problems.push(`${DASH_ID} was not refused (status ${refused.status})`);
    }
    const named = (refused.failures ?? []).find((failure) => failure.includes(DASH_ID));
    if (named === undefined) {
      problems.push(`refusal does not name ${DASH_ID}: ${JSON.stringify(refused.failures ?? [])}`);
    } else if (!named.includes(`nearest: ${CATALOG_ID}`)) {
      problems.push(`refusal does not name the nearest id ${CATALOG_ID}: ${named}`);
    }
    if (plan.status !== 'ok') {
      problems.push(`${CATALOG_ID} did not return a plan: ${JSON.stringify(plan.failures ?? [])}`);
    }
    return {
      criterion: 'preflight-refuses-dash',
      pass: problems.length === 0,
      detail: problems.length === 0
        ? `dry-run refuses ${DASH_ID} naming ${CATALOG_ID} and plans ${CATALOG_ID}`
        : problems.join('; '),
    };
  } catch (error) {
    return {
      criterion: 'preflight-refuses-dash',
      pass: false,
      detail: `dry-run dispatch failed: ${error.message}`,
    };
  }
}
