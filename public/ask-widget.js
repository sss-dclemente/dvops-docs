/* "Ask AI" support chat widget for the docs pages.
 *
 * Injected on every Starlight page via the `head` config in astro.config.mjs
 * — the same mechanism as the Cloudflare analytics beacon. No framework, no
 * persistence: panel state dies on reload. Talks to the dvops-ask Cloudflare
 * Worker (workers/ask) over SSE.
 *
 * Degrades gracefully: the button is only mounted after a successful
 * /v1/health check, so an unreachable endpoint means no widget at all.
 */
(() => {
  // Owner: REPLACE with the deployed dvops-ask worker URL
  // (`npx wrangler deploy` in workers/ask prints it, e.g.
  // https://dvops-ask.<account>.workers.dev) or the custom domain.
  const ASK_BASE = 'https://dvops-ask.duarte-clemente.workers.dev';

  if (window.__dvopsAskWidget) return;
  window.__dvopsAskWidget = true;

  const CSS = `
.dvask-btn {
  position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 200;
  font: 600 0.9375rem/1 var(--sl-font, 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif);
  color: #fff; background: var(--sl-color-accent, #0d7d72);
  border: 0; border-radius: 999px; padding: 0.75rem 1.1rem;
  cursor: pointer; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
.dvask-btn:hover { filter: brightness(1.1); }
.dvask-panel {
  position: fixed; right: 1.25rem; bottom: 4.5rem; z-index: 200;
  display: none; flex-direction: column; overflow: hidden;
  width: min(24rem, calc(100vw - 2.5rem)); max-height: min(70vh, 34rem);
  font-family: var(--sl-font, 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif);
  color: var(--sl-color-text, #eee);
  background: var(--sl-color-bg-nav, var(--sl-color-bg, #17181c));
  border: 1px solid var(--sl-color-hairline, #444);
  border-radius: 0.75rem; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
}
.dvask-panel.dvask-open { display: flex; }
.dvask-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.6rem 0.9rem; font-weight: 600;
  border-bottom: 1px solid var(--sl-color-hairline, #444);
}
.dvask-close {
  border: 0; background: none; color: inherit; font-size: 1.1rem;
  cursor: pointer; line-height: 1; padding: 0.15rem 0.35rem;
}
.dvask-out {
  flex: 1; overflow-y: auto; padding: 0.9rem;
  font-size: 0.9rem; line-height: 1.55; white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dvask-out:empty::before {
  content: 'Ask anything about Dataverse Ops MCP — answers come straight from these docs.';
  color: var(--sl-color-gray-3, #888);
}
.dvask-meta { padding: 0 0.9rem 0.6rem; font-size: 0.8rem; }
.dvask-meta a { color: var(--sl-color-accent-high, #93d4cb); }
.dvask-meta .dvask-srcs { margin: 0.25rem 0 0.4rem; }
.dvask-fb button {
  border: 1px solid var(--sl-color-hairline, #444); background: none;
  color: inherit; border-radius: 0.4rem; cursor: pointer;
  padding: 0.15rem 0.5rem; margin-right: 0.35rem; font-size: 0.85rem;
}
.dvask-fb button:hover { border-color: var(--sl-color-accent, #0d7d72); }
.dvask-form {
  display: flex; gap: 0.5rem; align-items: flex-end;
  padding: 0.7rem 0.9rem; border-top: 1px solid var(--sl-color-hairline, #444);
}
.dvask-form textarea {
  flex: 1; resize: none; min-height: 2.4rem; max-height: 6rem;
  font: 0.875rem/1.4 var(--sl-font, inherit);
  color: inherit; background: var(--sl-color-bg, #101115);
  border: 1px solid var(--sl-color-hairline, #444); border-radius: 0.5rem;
  padding: 0.45rem 0.6rem;
}
.dvask-form button {
  font: 600 0.875rem/1 var(--sl-font, inherit); color: #fff;
  background: var(--sl-color-accent, #0d7d72); border: 0;
  border-radius: 0.5rem; padding: 0.6rem 0.9rem; cursor: pointer;
}
.dvask-form button:disabled { opacity: 0.5; cursor: default; }
.dvask-err { color: var(--sl-color-red, #f66); }
`;

  function mount() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dvask-btn';
    btn.textContent = 'Ask AI';

    const panel = document.createElement('div');
    panel.className = 'dvask-panel';
    panel.innerHTML =
      '<div class="dvask-head"><span>Ask AI</span>' +
      '<button type="button" class="dvask-close" aria-label="Close">×</button></div>' +
      '<div class="dvask-out" aria-live="polite"></div>' +
      '<div class="dvask-meta"></div>' +
      '<form class="dvask-form">' +
      '<textarea rows="2" maxlength="500" placeholder="e.g. How do I see failing plug-ins?" aria-label="Your question"></textarea>' +
      '<button type="submit">Ask</button></form>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    const out = panel.querySelector('.dvask-out');
    const meta = panel.querySelector('.dvask-meta');
    const form = panel.querySelector('form');
    const textarea = panel.querySelector('textarea');
    const submit = form.querySelector('button[type="submit"]');

    btn.addEventListener('click', () => {
      panel.classList.toggle('dvask-open');
      if (panel.classList.contains('dvask-open')) textarea.focus();
    });
    panel.querySelector('.dvask-close').addEventListener('click', () => {
      panel.classList.remove('dvask-open');
    });
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    function showError(message) {
      const p = document.createElement('div');
      p.className = 'dvask-err';
      p.textContent = message;
      meta.replaceChildren(p);
    }

    function showDone(sources, questionId) {
      meta.replaceChildren();
      if (sources && sources.length > 0) {
        const srcs = document.createElement('div');
        srcs.className = 'dvask-srcs';
        srcs.append('Sources: ');
        sources.forEach((page, i) => {
          if (i > 0) srcs.append(' · ');
          const a = document.createElement('a');
          a.href = page;
          a.textContent = page;
          srcs.appendChild(a);
        });
        meta.appendChild(srcs);
      }
      if (typeof questionId === 'number') {
        const fb = document.createElement('div');
        fb.className = 'dvask-fb';
        fb.append('Did this answer help? ');
        for (const [label, resolved] of [['👍', true], ['👎', false]]) {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = label;
          b.addEventListener('click', () => {
            fetch(`${ASK_BASE}/v1/feedback`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ questionId, resolved }),
            }).catch(() => {});
            const thanks = document.createElement('span');
            thanks.textContent = 'Thanks for the feedback!';
            fb.replaceChildren(thanks);
          });
          fb.appendChild(b);
        }
        meta.appendChild(fb);
      }
    }

    async function ask(question) {
      out.textContent = '';
      meta.replaceChildren();
      submit.disabled = true;
      textarea.disabled = true;
      try {
        const res = await fetch(`${ASK_BASE}/v1/ask`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question }),
        });
        if (res.status === 429) {
          showError('Too many questions right now — please wait a minute and try again.');
          return;
        }
        if (!res.ok || !res.body) {
          showError('Something went wrong — please try again, or email support@simplesmoothsafe.com.');
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop();
          for (const frame of frames) {
            if (!frame.startsWith('data: ')) continue;
            let payload;
            try {
              payload = JSON.parse(frame.slice(6));
            } catch {
              continue;
            }
            if (typeof payload.delta === 'string') {
              out.textContent += payload.delta;
              out.scrollTop = out.scrollHeight;
            } else if (payload.done) {
              showDone(payload.sources, payload.questionId);
            } else if (payload.error) {
              showError('The answer was interrupted — please try again.');
            }
          }
        }
      } catch {
        showError('Could not reach the answer service — please try again later.');
      } finally {
        submit.disabled = false;
        textarea.disabled = false;
      }
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const question = textarea.value.trim();
      if (question === '' || submit.disabled) return;
      textarea.value = '';
      ask(question);
    });
  }

  function init() {
    // Only show the widget when the ask endpoint is actually reachable.
    fetch(`${ASK_BASE}/v1/health`)
      .then((res) => {
        if (res.ok) mount();
      })
      .catch(() => {
        /* endpoint unreachable — widget stays hidden */
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
