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
