import { describe, expect, it } from "vitest";
import { CLAUDE_MODEL, SYSTEM_PROMPT, buildUserContent, renderChunk } from "../src/prompt";

const chunk = (n: number) => ({
  page: `/tools/tool_${n}/`,
  title: `Tool ${n} — Inputs`,
  text: `Chunk body ${n}`,
});

describe("SYSTEM_PROMPT", () => {
  it("instructs answering only from the provided documentation excerpts", () => {
    expect(SYSTEM_PROMPT).toMatch(/ONLY from the provided documentation excerpts/i);
    expect(SYSTEM_PROMPT).toMatch(/never use outside knowledge/i);
  });

  it("requires citing/linking the source page for every claim", () => {
    expect(SYSTEM_PROMPT).toMatch(/cite the source page for every claim/i);
    expect(SYSTEM_PROMPT).toContain("page attribute");
  });

  it("offers the support address when the docs don't have the answer", () => {
    expect(SYSTEM_PROMPT).toContain("support@simplesmoothsafe.com");
  });
});

describe("model", () => {
  it("uses the roadmap-pinned Claude model", () => {
    expect(CLAUDE_MODEL).toBe("claude-sonnet-4-6");
  });
});

describe("renderChunk", () => {
  it("renders a <doc> block with the page attribute", () => {
    const rendered = renderChunk(chunk(1));
    expect(rendered).toBe(
      '<doc page="/tools/tool_1/" title="Tool 1 — Inputs">\nChunk body 1\n</doc>',
    );
  });

  it("escapes quotes in attributes", () => {
    const rendered = renderChunk({ page: '/x/"y"/', title: 'A "B"', text: "t" });
    expect(rendered).toContain('page="/x/&quot;y&quot;/"');
    expect(rendered).toContain('title="A &quot;B&quot;"');
  });
});

describe("buildUserContent", () => {
  it("contains the question and exactly the 6 chunks as <doc> blocks with page attrs", () => {
    const chunks = [1, 2, 3, 4, 5, 6].map(chunk);
    const content = buildUserContent("How do I filter traces?", chunks);

    expect(content.startsWith("How do I filter traces?")).toBe(true);
    expect(content.match(/<doc page="/g)).toHaveLength(6);
    expect(content.match(/<\/doc>/g)).toHaveLength(6);
    for (const c of chunks) {
      expect(content).toContain(`<doc page="${c.page}"`);
      expect(content).toContain(c.text);
    }
  });
});
