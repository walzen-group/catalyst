// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec }
// and returns { criterion, pass, detail }. The criterion string matches a
// deterministic criterion id in test.yaml. Zero runtime deps, Node ESM.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Forbidden sources: this dispatch's identifiers (the dispatch id, the wave's
// real agent names, the project, the worker names). The repaired rules' own
// language ("watcher, not a monitored agent", "bounded background wait") is NOT
// forbidden: quoting it is evidence of reading the live instructions. The
// incident id 2026-08-26-meta-orchestrator-wait-churn is likewise NOT forbidden:
// the repaired meta skill cross-references it in its own text (as the meta skill
// already cites 2026-08-04-orchestrator-self-wait), and the actor's cwd is this
// test directory of the same name, so the id reaches the actor through the live
// instructions and the test path, never only through the incident report. An
// actor that actually read the incident report would echo a still-forbidden
// token below (a wave name, the dispatch id, the project) or trip the read-path
// rule. A bare mention of .cortex/ is not contamination either: the scenario's
// constraint text echoes it; an actual read is caught by the read-path rule.
const FORBIDDEN_SOURCES =
  /2026-08-25-shared-contested-w2|meta-wave[12]-contested|shared-contested|statswatch|impl-task[345]-(?:hybrid-control|control|escort)/i;

// Evidence a git command actually RAN: git status' "On branch <name>" line,
// or git log --oneline output (short hash + conventional-commit subject).
const GIT_OUTPUT =
  /On branch [\w./-]+|^[0-9a-f]{7,40}\s+(feat|fix|chore|docs|refactor|test|revert)\b/m;

// Evidence of a forbidden .cortex read: a Read tool call naming the project's
// or the kit's memory/incidents/plans/reports/tests trees, or the kit cortex
// root itself.
const FORBIDDEN_READ =
  /Read\s+\S*\/\.cortex\/(memory|incidents|plans|reports|\.tests)\b|Read\s+\S*\/nix\/\.cortex\b/i;

// Evidence a file was actually written or edited: a write/edit tool call
// naming a concrete path under the home roots with a real file extension. The
// scenario names no file paths, so any such mention is a write attempt.
const FORBIDDEN_WRITE =
  /(?:write|edit)\s*\(?\s*["'`]?(?:\/home\/vscode\/|~\/)[^"'`\s)]+\.(?:md|json|txt|mjs|ya?ml)\b/i;

// Criterion no-contamination: fail when the actor cites a forbidden source,
// ran a git command, read forbidden .cortex content, or wrote a file.
export function contaminationScan(ctx) {
  const text = `${ctx.transcript ?? ''}\n${ctx.actorReport ?? ''}`;
  const hits = [];
  if (FORBIDDEN_SOURCES.test(text)) hits.push('cited a dispatch/incident identifier');
  if (GIT_OUTPUT.test(text)) hits.push('ran a git command');
  if (FORBIDDEN_READ.test(text)) hits.push('read forbidden .cortex content');
  if (FORBIDDEN_WRITE.test(text)) hits.push('wrote or edited a file');
  return {
    criterion: 'no-contamination',
    pass: hits.length === 0,
    detail: hits.length ? hits.join('; ') : 'no forbidden source, git run, cortex read, or write evidence',
  };
}

// Climb from the test directory to the kit root, where covered_files paths
// are rooted (skills/...).
function kitRoot(testDir) {
  let dir = resolve(testDir ?? '.');
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'skills', 'catalyst-v2-running-a-meta-agent', 'SKILL.md'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

function flatFile(root, ...parts) {
  const file = join(root, ...parts);
  return readFileSync(file, 'utf8').replace(/\s+/g, ' ').toLowerCase();
}

// Load-bearing phrases of the two repaired rules, whitespace-collapsed so prose
// wrapping cannot break a pin. Keyed by the skill file each pin must appear in.
// Red against the pre-fix text, green after it.
const META_PINS = [
  'the orchestrator is your watcher, not a monitored agent',
  'never arm a wait on the orchestrator',
  'check the monitored workers before you re-arm',
  'the hand-back push is the primary completion signal',
  'the ceiling is a bound, never a duration to sleep out',
  'a wait return names an event, not a state',
];
const MUX_PINS = [
  'the background wait is how you sleep between checks',
  'a wait return names an event, not a state',
  'a hold that sits to its ceiling while the work already finished is wasted wall-clock',
];
const PLAN_PINS = [
  'addressed to the monitoring meta',
];

// Criterion skill-meta-scope-and-churn-present: both repaired SKILL.md files
// state their rule with every load-bearing part present.
export function skillMetaScopeAndChurnPresent(ctx) {
  const root = kitRoot(ctx?.testDir);
  if (!root) {
    return { criterion: 'skill-meta-scope-and-churn-present', pass: false, detail: 'kit root not found from testDir' };
  }
  const metaFlat = flatFile(root, 'skills', 'catalyst-v2-running-a-meta-agent', 'SKILL.md');
  const muxFlat = flatFile(root, 'skills', 'catalyst-v2-multiplexer-agent-ops', 'SKILL.md');
  const planFlat = flatFile(root, 'skills', 'catalyst-v2-planning-artifacts', 'SKILL.md');
  const missing = [
    ...META_PINS.filter((p) => !metaFlat.includes(p)).map((p) => `meta: ${p}`),
    ...MUX_PINS.filter((p) => !muxFlat.includes(p)).map((p) => `mux: ${p}`),
    ...PLAN_PINS.filter((p) => !planFlat.includes(p)).map((p) => `plan: ${p}`),
  ];
  const total = META_PINS.length + MUX_PINS.length + PLAN_PINS.length;
  return {
    criterion: 'skill-meta-scope-and-churn-present',
    pass: missing.length === 0,
    detail: missing.length ? `missing pins: ${missing.join(' | ')}` : `all ${total} pins present`,
  };
}
