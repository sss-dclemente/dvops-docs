// Markdown chunking for the "Ask AI" embeddings index.
//
// Shared between the build-step indexer (scripts/build-ask-index.mjs) and the
// worker's tests (workers/ask/test/chunker.test.ts) so both exercise the same
// logic. Plain Node, no dependencies.

const MAX_CHUNK = 2500; // chars — hard ceiling per chunk
const MIN_CHUNK = 1500; // chars — soft target before a chunk is closed

/**
 * Split a markdown document into { frontmatter, body }.
 * frontmatter is the raw text between the leading `---` fences (or null).
 */
export function stripFrontmatter(markdown) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
  if (!m) return { frontmatter: null, body: markdown };
  return { frontmatter: m[1], body: markdown.slice(m[0].length) };
}

/** Extract the `title:` value from raw frontmatter text (JSON/quoted or bare). */
export function frontmatterTitle(frontmatter) {
  if (!frontmatter) return null;
  const m = /^title:\s*(.+?)\s*$/m.exec(frontmatter);
  if (!m) return null;
  let value = m[1];
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      value = JSON.parse(value);
    } catch {
      value = value.slice(1, -1);
    }
  } else if (value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1);
  }
  return value;
}

/**
 * Map a path relative to src/content/docs to its Starlight URL path:
 *   tools/get_plugin_traces.md  -> /tools/get_plugin_traces/
 *   changelog.md                -> /changelog/
 *   getting-started/index.md    -> /getting-started/
 */
export function pagePathForFile(relPath) {
  const slug = relPath.replace(/\\/g, '/').replace(/\.mdx?$/, '');
  if (slug === 'index') return '/';
  if (slug.endsWith('/index')) return `/${slug.slice(0, -'/index'.length)}/`;
  return `/${slug}/`;
}

/** Split the body into sections at markdown heading lines (fence-aware). */
function splitSections(body) {
  const sections = [];
  let current = { heading: null, lines: [] };
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^(```|~~~)/.test(line.trim())) inFence = !inFence;
    if (!inFence && /^#{1,6}\s/.test(line)) {
      if (current.heading !== null || current.lines.some((l) => l.trim() !== '')) {
        sections.push(current);
      }
      current = { heading: line.replace(/^#{1,6}\s+/, '').trim(), lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.heading !== null || current.lines.some((l) => l.trim() !== '')) {
    sections.push(current);
  }
  return sections;
}

/** Split an oversized section's text on paragraph (blank-line) boundaries. */
function splitParagraphs(heading, text) {
  const pieces = [];
  let buf = '';
  for (const para of text.split(/\n{2,}/)) {
    if (buf !== '' && buf.length + para.length + 2 > MAX_CHUNK) {
      pieces.push({ heading, text: buf });
      buf = '';
    }
    buf = buf === '' ? para : `${buf}\n\n${para}`;
  }
  if (buf !== '') pieces.push({ heading, text: buf });
  return pieces;
}

/**
 * Chunk one docs page into ~1500-2500 character chunks on heading boundaries,
 * falling back to paragraph boundaries for oversized sections.
 *
 * @param {{ page: string, markdown: string, pageTitle?: string }} input
 *   page: the URL path (e.g. "/tools/get_plugin_traces/")
 * @returns {{ id: string, page: string, title: string, text: string }[]}
 */
export function chunkPage({ page, markdown, pageTitle }) {
  const { frontmatter, body } = stripFrontmatter(markdown);
  const title = pageTitle ?? frontmatterTitle(frontmatter) ?? page;

  // Sections at heading boundaries; oversized sections fall back to paragraphs.
  const pieces = [];
  for (const section of splitSections(body)) {
    const text = section.lines.join('\n').trim();
    if (text === '') continue;
    if (text.length <= MAX_CHUNK) pieces.push({ heading: section.heading, text });
    else pieces.push(...splitParagraphs(section.heading, text));
  }

  // Greedy merge of consecutive pieces into MIN_CHUNK..MAX_CHUNK chunks.
  const merged = [];
  let buf = null;
  const flush = () => {
    if (buf) merged.push(buf);
    buf = null;
  };
  for (const piece of pieces) {
    if (buf && buf.len + piece.text.length + 2 > MAX_CHUNK) flush();
    if (!buf) buf = { heading: piece.heading, texts: [], len: 0 };
    buf.texts.push(piece.text);
    buf.len += piece.text.length + (buf.texts.length > 1 ? 2 : 0);
    if (buf.len >= MIN_CHUNK) flush();
  }
  flush();

  return merged.map((chunk, i) => ({
    id: `${page}#${i}`,
    page,
    // Page title + nearest heading (heading of the chunk's first piece).
    title: chunk.heading ? `${title} — ${chunk.heading}` : title,
    text: chunk.texts.join('\n\n'),
  }));
}
