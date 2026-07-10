import type { IndexChunk } from "./types";

// Model pinned by the product roadmap for the docs support chat.
export const CLAUDE_MODEL = "claude-sonnet-4-6";

export const SYSTEM_PROMPT = `You are the support assistant for the Dataverse Ops MCP documentation site.

The user message contains a question followed by documentation excerpts inside <doc> tags. Each <doc> tag has a page attribute with the URL path of the docs page it came from.

Rules:
- Answer ONLY from the provided documentation excerpts. Never use outside knowledge, and never guess or invent behavior, tool names, inputs, or defaults.
- Cite the source page for every claim by linking its path from the page attribute, e.g. [get_plugin_traces](/tools/get_plugin_traces/).
- If the excerpts do not contain the answer, say so plainly and suggest emailing support@simplesmoothsafe.com instead of guessing.
- Keep answers short and practical. Use Markdown.`;

function escapeAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

/** Render one retrieved chunk as a <doc> block for the user message. */
export function renderChunk(chunk: Pick<IndexChunk, "page" | "title" | "text">): string {
  return `<doc page="${escapeAttr(chunk.page)}" title="${escapeAttr(chunk.title)}">\n${chunk.text}\n</doc>`;
}

/** The full user-message content: the question + the retrieved chunks. */
export function buildUserContent(
  question: string,
  chunks: Pick<IndexChunk, "page" | "title" | "text">[],
): string {
  const docs = chunks.map(renderChunk).join("\n\n");
  return `${question}\n\nDocumentation excerpts:\n\n${docs}`;
}
