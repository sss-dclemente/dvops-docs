# dvops-docs

Docs + landing site for **Dataverse Ops MCP** (`@simplesmoothsafe/dataverse-ops-mcp`).
Built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build).

- `/` — custom landing page (hero, quickstart, tool matrix, pricing, footer).
- `/getting-started/*`, `/tools/*`, `/security/`, `/changelog/` — Starlight docs.

## Local dev

```sh
npm install
npm run sync   # pull tool docs + changelog from the MCP repo (see below)
npm run dev    # http://localhost:4321
```

## Docs sync

Tool reference pages and the changelog are **not authored here** — they are
synced from the MCP server repo by `scripts/sync-docs.mjs`:

- `docs/tools/*.md` → `src/content/docs/tools/*.md` (Starlight frontmatter is
  injected: title from the first H1, description from the first paragraph; the
  duplicate H1 is stripped and relative tool-to-tool links are rewritten).
- `CHANGELOG.md` → `src/content/docs/changelog.md` (frontmatter title "Changelog").

The source repo path defaults to a sibling checkout at `../dataverse-mcp-pro`;
override with `DVOPS_MCP_REPO=/path/to/repo npm run sync`.

**Run `npm run sync` before every deploy** so the published tool pages and
changelog match the released server. The synced files are committed so plain
`npm run build` also works, but they can be stale until the next sync.

## AI support chat

Docs pages have a floating **Ask AI** button (`public/ask-widget.js`, injected
via the Starlight `head` config like the analytics beacon). It streams answers
from a small Cloudflare Worker in `workers/ask` that does RAG over an
embeddings index of these docs and answers with Claude (`claude-sonnet-4-6`,
official `@anthropic-ai/sdk`). Questions (text only — **no IP, no user agent**)
are stored in a D1 table for docs-gap analysis; thumbs up/down feedback sets
`resolved` on the same row.

Setting it up end to end:

1. **Build the embeddings index** (embeds every page under
   `src/content/docs` with Workers AI `@cf/baai/bge-base-en-v1.5`):

   ```sh
   npm run sync
   CF_ACCOUNT_ID=<account-id> CF_API_TOKEN=<token with Workers AI read> npm run build:ask-index
   ```

   This writes `workers/ask/ask-index.json` (gitignored), which the worker
   bundles at deploy time. Without credentials (local tests, CI), the worker
   falls back to the committed `workers/ask/ask-index.sample.json` — that
   fallback is for build/test only; always rebuild the real index before a
   production deploy so answers match the published docs.

2. **Deploy the worker** (from `workers/ask`):

   ```sh
   npm install
   npx wrangler d1 create dvops-ask        # once — paste the id into wrangler.toml (database_id)
   npx wrangler d1 migrations apply dvops-ask --remote
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler deploy
   ```

3. **Point the widget at the worker**: edit the `ASK_BASE` const at the top of
   `public/ask-widget.js` (placeholder `https://ask.simplesmoothsafe.com`) to
   the deployed worker URL, then redeploy the site. The widget hides itself
   whenever `GET /v1/health` on that URL fails, so a missing/broken worker
   never breaks the docs.

Worker development: `npm test` and `npm run typecheck` in `workers/ask`
(vitest + `tsc --noEmit`; no Cloudflare credentials needed). CORS currently
allows any origin — restrict it in `workers/ask/src/index.ts` once the docs
domain is final. Re-run step 1 + `npx wrangler deploy` whenever the docs
change so the index stays fresh.

## Deploy (Cloudflare Pages, manual)

- Build command: `npm run sync && npm run build`
- Output directory: `dist`

Via the dashboard, or with wrangler:

```sh
npm run sync && npm run build
npx wrangler pages deploy dist
```

`wrangler.toml` sets `pages_build_output_dir = "dist"`. No CI is configured yet.

## Placeholders to fill in

| Where | Placeholder | Replace with |
| --- | --- | --- |
| `src/pages/index.astro` (pricing buttons) | `https://buy.paddle.com/PLACEHOLDER_PRO` / `..._ENTERPRISE` | Real Paddle checkout links |
| `astro.config.mjs` (`CF_ANALYTICS_TOKEN`) and `src/pages/index.astro` head | `REPLACE_WITH_CF_ANALYTICS_TOKEN` | Cloudflare Web Analytics token (dashboard → Analytics & Logs → Web Analytics) |
| Footer / `src/pages/index.astro` | `https://status.simplesmoothsafe.com` | Real status page once it exists |
| `astro.config.mjs` (`site`) | `https://dataverse-ops-mcp.pages.dev` | Final production domain |
| `public/ask-widget.js` (`ASK_BASE`) | `https://ask.simplesmoothsafe.com` | Deployed `dvops-ask` worker URL (see "AI support chat") |
| `workers/ask/wrangler.toml` (`database_id`) | `REPLACE_ME` | Id from `npx wrangler d1 create dvops-ask` |
