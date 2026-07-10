#!/usr/bin/env node
// Builds the embeddings index for the "Ask AI" support chat worker.
//
//   CF_ACCOUNT_ID=... CF_API_TOKEN=... npm run build:ask-index
//
// Reads every markdown page under src/content/docs, strips frontmatter,
// chunks each page on heading boundaries (~1500-2500 chars, paragraph
// fallback), embeds each chunk via Cloudflare Workers AI (see
// scripts/lib/embeddings.mjs) and writes workers/ask/ask-index.json.
//
// Run this (after `npm run sync`) before `wrangler deploy` in workers/ask so
// the deployed worker bundles an index that matches the published docs. When
// the file is absent (no CF credentials, e.g. local tests), workers/ask falls
// back to the committed ask-index.sample.json — see
// workers/ask/scripts/ensure-index.mjs.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chunkPage, pagePathForFile } from './lib/chunker.mjs';
import { embedTexts, EMBEDDING_MODEL } from './lib/embeddings.mjs';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(siteRoot, 'src', 'content', 'docs');
const outFile = path.join(siteRoot, 'workers', 'ask', 'ask-index.json');

async function collectMarkdownFiles(dir, base = '') {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = base === '' ? entry.name : `${base}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(path.join(dir, entry.name), rel)));
    } else if (/\.mdx?$/.test(entry.name)) {
      files.push(rel);
    }
  }
  return files.sort();
}

const files = await collectMarkdownFiles(docsDir);
if (files.length === 0) {
  console.error(`no markdown found under ${docsDir} — did you run npm run sync?`);
  process.exit(1);
}

const chunks = [];
for (const rel of files) {
  const markdown = await readFile(path.join(docsDir, rel), 'utf8');
  const page = pagePathForFile(rel);
  const pageChunks = chunkPage({ page, markdown });
  chunks.push(...pageChunks);
  console.log(`chunked ${rel} -> ${pageChunks.length} chunk(s)`);
}

console.log(`embedding ${chunks.length} chunk(s) with ${EMBEDDING_MODEL}...`);
const vectors = await embedTexts(chunks.map((c) => c.text));

const index = {
  model: EMBEDDING_MODEL,
  dims: vectors[0]?.length ?? 0,
  chunks: chunks.map((chunk, i) => ({ ...chunk, vector: vectors[i] })),
};

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(index), 'utf8');
console.log(
  `wrote ${path.relative(siteRoot, outFile)}: ${index.chunks.length} chunks, ${index.dims} dims`,
);
