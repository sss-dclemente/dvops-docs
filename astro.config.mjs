// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Cloudflare Web Analytics (privacy-friendly, no cookies).
// Owner: replace REPLACE_WITH_CF_ANALYTICS_TOKEN with the real token from the
// Cloudflare dashboard (Analytics & Logs -> Web Analytics).
const CF_ANALYTICS_TOKEN = 'REPLACE_WITH_CF_ANALYTICS_TOKEN';

export default defineConfig({
  site: 'https://dataverse-ops-mcp.pages.dev',
  integrations: [
    starlight({
      title: 'Dataverse Ops MCP',
      description:
        'Dataverse diagnostics inside your AI assistant, over MCP/stdio. Data never leaves your tenant.',
      social: [
        {
          icon: 'email',
          label: 'Support',
          href: 'mailto:support@simplesmoothsafe.com',
        },
      ],
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { slug: 'getting-started/claude-desktop' },
            { slug: 'getting-started/claude-code' },
            { slug: 'getting-started/copilot-studio' },
          ],
        },
        {
          label: 'Tools',
          items: [{ autogenerate: { directory: 'tools' } }],
        },
        { slug: 'security' },
        { slug: 'changelog' },
      ],
      customCss: [
        '@fontsource/ibm-plex-sans/400.css',
        '@fontsource/ibm-plex-sans/600.css',
        '@fontsource/ibm-plex-sans/700.css',
        '@fontsource/ibm-plex-mono/400.css',
        '@fontsource/ibm-plex-mono/600.css',
        './src/styles/custom.css',
      ],
      head: [
        // Cloudflare Web Analytics beacon (no cookies). Token is a placeholder;
        // see comment on CF_ANALYTICS_TOKEN above.
        {
          tag: 'script',
          attrs: {
            defer: true,
            src: 'https://static.cloudflareinsights.com/beacon.min.js',
            'data-cf-beacon': `{"token": "${CF_ANALYTICS_TOKEN}"}`,
          },
        },
        // "Ask AI" support chat widget (public/ask-widget.js), injected the
        // same way as the beacon above. Hides itself when the ask worker
        // (workers/ask) is unreachable. Endpoint URL is a const in the file.
        {
          tag: 'script',
          attrs: {
            defer: true,
            src: '/ask-widget.js',
          },
        },
      ],
    }),
  ],
});
