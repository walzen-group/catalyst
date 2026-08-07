// Tiny YAML reader for a test's test.yaml. One constrained shape only: block
// maps, nested block maps, and block sequences of scalars. Every value is a
// string. Zero runtime deps, Node ESM. The models.yaml grammar has its own,
// separate reader in config.mjs; this one carries the richer test.yaml shape
// (nested maps for actor/judge/criteria, scalar lists for covered_files and
// isolation) while staying just as strict.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

function fail(path, lineNo, message) {
  const where = lineNo == null ? path : `${path}:${lineNo}`;
  throw new Error(`test.yaml parse error (${where}): ${message}`);
}

// A whole-line comment (first non-space char is #) is dropped. Trailing inline
// comments are left intact so prose values keep any stray # they carry.
function isCommentLine(line) {
  return /^\s*#/.test(line);
}

function unquote(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

// Tokenize into significant lines, each carrying its content indent and whether
// it opens a sequence item.
function tokenize(text, path) {
  const tokens = [];
  const lines = text.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const raw = lines[idx];
    const lineNo = idx + 1;
    if (raw.includes('\t')) fail(path, lineNo, 'tabs are not allowed; use 2-space indent');
    if (raw.trim() === '' || isCommentLine(raw)) continue;

    const leading = raw.length - raw.replace(/^ +/, '').length;
    if (leading % 2 !== 0) fail(path, lineNo, `indent must be a multiple of 2, got ${leading}`);
    const afterIndent = raw.slice(leading);

    if (afterIndent === '-' || afterIndent.startsWith('- ')) {
      const content = afterIndent === '-' ? '' : afterIndent.slice(2).trim();
      tokens.push({ indent: leading + 2, isItem: true, content, lineNo });
    } else {
      tokens.push({ indent: leading, isItem: false, content: afterIndent.trimEnd(), lineNo });
    }
  }
  return tokens;
}

function parseScalar(text, path, lineNo) {
  const value = unquote(text.trim());
  return value;
}

function parseSequence(tokens, cursor, indent, path) {
  const arr = [];
  while (cursor.i < tokens.length && tokens[cursor.i].indent === indent && tokens[cursor.i].isItem) {
    const tok = tokens[cursor.i];
    cursor.i += 1;
    if (tok.content === '') {
      fail(path, tok.lineNo, 'empty list item; a scalar item must carry a value');
    }
    // Every item is a plain scalar string, prose included (a colon in the prose
    // is kept verbatim). This reader carries scalar lists only; a list of maps
    // is expressed as a nested map instead (see criteria in test.yaml).
    arr.push(parseScalar(tok.content, path, tok.lineNo));
  }
  return arr;
}

function parseMap(tokens, cursor, indent, path) {
  const obj = {};
  while (cursor.i < tokens.length && tokens[cursor.i].indent === indent && !tokens[cursor.i].isItem) {
    const tok = tokens[cursor.i];
    const colon = tok.content.indexOf(':');
    if (colon === -1) fail(path, tok.lineNo, 'expected key: value');
    const key = tok.content.slice(0, colon).trim();
    const rest = tok.content.slice(colon + 1).trim();
    if (key === '') fail(path, tok.lineNo, 'empty key');
    if (Object.prototype.hasOwnProperty.call(obj, key)) fail(path, tok.lineNo, `duplicate key "${key}"`);
    cursor.i += 1;

    if (rest !== '') {
      obj[key] = parseScalar(rest, path, tok.lineNo);
      continue;
    }
    // A bare `key:` opens a nested block: the next deeper-indented run is either
    // a map or a scalar sequence.
    const next = tokens[cursor.i];
    if (next && next.indent > indent) {
      obj[key] = parseNode(tokens, cursor, next.indent, path);
    } else {
      obj[key] = null;
    }
  }
  return obj;
}

function parseNode(tokens, cursor, indent, path) {
  const first = tokens[cursor.i];
  if (first.isItem) return parseSequence(tokens, cursor, indent, path);
  return parseMap(tokens, cursor, indent, path);
}

/** Parse the constrained test.yaml grammar into a plain nested object. */
export function parseYaml(text, path = '<string>') {
  const tokens = tokenize(text, path);
  if (tokens.length === 0) fail(path, null, 'document is empty');
  if (tokens[0].indent !== 0) fail(path, tokens[0].lineNo, 'top level must start at indent 0');
  const cursor = { i: 0 };
  const value = parseNode(tokens, cursor, 0, path);
  if (cursor.i !== tokens.length) {
    fail(path, tokens[cursor.i].lineNo, 'unexpected indentation; the document is not one consistent tree');
  }
  return value;
}
