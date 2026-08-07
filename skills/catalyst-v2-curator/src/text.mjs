// Deterministic text helpers: timestamps, slugs, frontmatter, titles. Kept pure
// so a fixed clock in a test gives fixed output.

/** Full ISO stamp for ledger fields (created, last_relevant). */
export function stampIso(now) {
  return now.toISOString();
}

/** Compact UTC stamp for a filename: 20260804T071500Z (filesystem-safe, sorts). */
export function stampCompact(now) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * A kebab slug from free text: lowercase, alphanumerics joined by single
 * hyphens, capped to a handful of words so a filename stays short.
 */
export function slugify(text, { maxWords = 6, maxLen = 48 } = {}) {
  const words = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords);
  const slug = words.join('-').slice(0, maxLen).replace(/-+$/, '');
  return slug || 'note';
}

/**
 * Split a leading YAML frontmatter block from a body. A leading `---` line
 * through the next `---` line is the frontmatter; the rest is the body. No
 * frontmatter means empty meta and the whole text as body.
 */
export function splitFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0]?.trim() !== '---') return { meta: {}, body: text.replace(/^\n+/, '') };
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      const meta = {};
      for (const line of lines.slice(1, i)) {
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
      }
      return { meta, body: lines.slice(i + 1).join('\n').replace(/^\n+/, '') };
    }
  }
  return { meta: {}, body: text.replace(/^\n+/, '') };
}

/** First `# ` heading text, or the slug when a file carries none. */
export function titleOf(text, fallback) {
  for (const line of text.split('\n')) {
    const match = /^#\s+(.+?)\s*$/.exec(line);
    if (match) return match[1];
  }
  return fallback;
}

/** A one-line preview of body text, whitespace-collapsed and capped. */
export function preview(text, len = 80) {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  return flat.length > len ? `${flat.slice(0, len - 1)}…` : flat;
}
