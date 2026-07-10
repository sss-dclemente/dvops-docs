#!/usr/bin/env node
// Syncs tool docs + changelog from the dataverse-ops-mcp repo into this site.
//
//   node scripts/sync-docs.mjs
//
// Source repo path is configurable via DVOPS_MCP_REPO (defaults to a sibling
// checkout at ../dataverse-mcp-pro). Reads only docs/tools/*.md and
// CHANGELOG.md from the source repo; never writes to it.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(
  siteRoot,
  process.env.DVOPS_MCP_REPO ?? '../dataverse-mcp-pro',
);

const srcToolsDir = path.join(repoRoot, 'docs', 'tools');
const outToolsDir = path.join(siteRoot, 'src', 'content', 'docs', 'tools');

/**
 * Split a markdown document into { title, description, body }:
 * - title: text of the first H1
 * - description: first paragraph after the H1, collapsed to one line
 * - body: the document with the H1 removed (Starlight renders the
 *   frontmatter title as the page H1, so keeping it would duplicate it)
 */
function extractParts(markdown) {
  const lines = markdown.split('\n');
  let title = '';
  let h1Index = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = /^#\s+(.+?)\s*$/.exec(lines[i]);
    if (m) {
      title = m[1];
      h1Index = i;
      break;
    }
  }
  // First paragraph after the H1 (skip blank lines, stop at blank/heading).
  let description = '';
  if (h1Index !== -1) {
    let i = h1Index + 1;
    while (i < lines.length && lines[i].trim() === '') i++;
    const para = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#')) {
      para.push(lines[i].trim());
      i++;
    }
    description = para.join(' ');
  }
  const body =
    h1Index === -1
      ? markdown
      : [...lines.slice(0, h1Index), ...lines.slice(h1Index + 1)].join('\n');
  return { title, description, body: body.replace(/^\n+/, '') };
}

/** Rewrite relative links between tool pages: ](./foo.md) or ](foo.md) -> ](/tools/foo/) */
function rewriteToolLinks(markdown) {
  return markdown.replace(
    /\]\((?:\.\/)?([\w-]+)\.md(#[^)\s]*)?\)/g,
    (_all, slug, anchor) => `](/tools/${slug}/${anchor ?? ''})`,
  );
}

function frontmatter(fields) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value) lines.push(`${key}: ${JSON.stringify(value)}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

async function syncTools() {
  const entries = (await readdir(srcToolsDir)).filter((f) => f.endsWith('.md')).sort();
  await mkdir(outToolsDir, { recursive: true });
  for (const file of entries) {
    const raw = await readFile(path.join(srcToolsDir, file), 'utf8');
    const { title, description, body } = extractParts(raw);
    const out =
      frontmatter({ title: title || path.basename(file, '.md'), description }) +
      rewriteToolLinks(body);
    await writeFile(path.join(outToolsDir, file), out, 'utf8');
    console.log(`synced tools/${file}`);
  }
  return entries.length;
}

async function syncChangelog() {
  const raw = await readFile(path.join(repoRoot, 'CHANGELOG.md'), 'utf8');
  const { description, body } = extractParts(raw);
  const out = frontmatter({ title: 'Changelog', description }) + body;
  await writeFile(
    path.join(siteRoot, 'src', 'content', 'docs', 'changelog.md'),
    out,
    'utf8',
  );
  console.log('synced changelog.md');
}

const count = await syncTools();
await syncChangelog();
console.log(`done: ${count} tool page(s) + changelog from ${repoRoot}`);
