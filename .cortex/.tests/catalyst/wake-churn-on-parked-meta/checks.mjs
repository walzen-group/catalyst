// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec }
// and returns { criterion, pass, detail }. The criterion string matches a
// deterministic criterion id in test.yaml. Zero runtime deps, Node ESM.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Forbidden sources: this dispatch's identifiers (incident id, dispatch id,
// the wave's real agent names). The repaired rule's own language ("instant
// settles", "polling watch") is NOT forbidden: quoting it is evidence of
// reading the live instructions. A bare mention of .cortex/ is not either:
// the scenario's constraint text echoes it; an actual read is caught by the
// read-path rule below.
const FORBIDDEN_SOURCES =
  /2026-08-24-wake-churn-on-parked-meta|2026-08-24-electron-port-w0b|meta-w0b|impl-ep-t1b/i;

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
    if (existsSync(join(dir, 'skills', 'catalyst-v2-multiplexer-agent-ops', 'SKILL.md'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

// Load-bearing phrases of the repaired rule, whitespace-collapsed so prose
// wrapping cannot break a pin. Red against the pre-fix text, green after it.
const PINS = [
  'consecutive instant settles carry no signal',
  'bounded background polling watch',
  'never a foreground poll',
  'never a standing default',
  'default wake primitive',
];

// Criterion skill-churn-rule-present: the repaired SKILL.md states the churn
// rule with every load-bearing part present.
export function skillChurnRulePresent(ctx) {
  const root = kitRoot(ctx?.testDir);
  if (!root) {
    return { criterion: 'skill-churn-rule-present', pass: false, detail: 'kit root not found from testDir' };
  }
  const file = join(root, 'skills', 'catalyst-v2-multiplexer-agent-ops', 'SKILL.md');
  const flat = readFileSync(file, 'utf8').replace(/\s+/g, ' ').toLowerCase();
  const missing = PINS.filter((p) => !flat.includes(p));
  return {
    criterion: 'skill-churn-rule-present',
    pass: missing.length === 0,
    detail: missing.length ? `missing pins: ${missing.join(' | ')}` : `all ${PINS.length} pins present`,
  };
}
