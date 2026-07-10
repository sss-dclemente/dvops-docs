// Guarantees ask-index.json exists so the worker can be bundled, type-checked
// and tested without Cloudflare credentials.
//
// In production the REAL index is imported: run `npm run build:ask-index` at
// the repo root (needs CF_ACCOUNT_ID/CF_API_TOKEN) before `wrangler deploy`
// — it overwrites ask-index.json with embeddings of the current docs. When
// that file is absent (fresh clone, CI without secrets), this script copies
// the committed ask-index.sample.json (3 tiny fake chunks, 8-dim vectors) in
// its place; it never overwrites a real index. ask-index.json is gitignored.
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const real = path.join(workerRoot, 'ask-index.json');
const sample = path.join(workerRoot, 'ask-index.sample.json');

if (!existsSync(real)) {
  copyFileSync(sample, real);
  console.log('ask-index.json missing — copied ask-index.sample.json (build/test fallback)');
}
