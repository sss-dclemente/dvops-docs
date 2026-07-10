import { describe, expect, it } from "vitest";
// The chunker is shared with scripts/build-ask-index.mjs (repo root).
// @ts-expect-error — plain .mjs module without type declarations
import { chunkPage, frontmatterTitle, pagePathForFile, stripFrontmatter } from "../../../scripts/lib/chunker.mjs";

interface Chunk {
  id: string;
  page: string;
  title: string;
  text: string;
}

const paragraph = (seed: string, chars: number) =>
  `${seed} `.repeat(Math.ceil(chars / (seed.length + 1))).slice(0, chars).trimEnd();

describe("stripFrontmatter", () => {
  it("removes the frontmatter block and returns its raw text", () => {
    const md = '---\ntitle: "Hello"\ndescription: "x"\n---\nBody text.';
    const { frontmatter, body } = stripFrontmatter(md);
    expect(frontmatter).toContain('title: "Hello"');
    expect(body).toBe("Body text.");
  });

  it("passes documents without frontmatter through untouched", () => {
    const { frontmatter, body } = stripFrontmatter("# Title\nBody");
    expect(frontmatter).toBeNull();
    expect(body).toBe("# Title\nBody");
  });

  it("parses quoted titles", () => {
    expect(frontmatterTitle('title: "get_plugin_traces"')).toBe("get_plugin_traces");
    expect(frontmatterTitle("title: Changelog")).toBe("Changelog");
  });
});

describe("pagePathForFile", () => {
  it("maps docs-relative files to Starlight URL paths", () => {
    expect(pagePathForFile("tools/get_plugin_traces.md")).toBe("/tools/get_plugin_traces/");
    expect(pagePathForFile("changelog.md")).toBe("/changelog/");
    expect(pagePathForFile("getting-started/claude-code.md")).toBe(
      "/getting-started/claude-code/",
    );
    expect(pagePathForFile("getting-started/index.md")).toBe("/getting-started/");
    expect(pagePathForFile("index.md")).toBe("/");
    expect(pagePathForFile("security.mdx")).toBe("/security/");
  });
});

describe("chunkPage", () => {
  it("splits on heading boundaries and titles chunks with the nearest heading", () => {
    const alpha = paragraph("alpha words here", 1700);
    const beta = paragraph("beta words here", 1700);
    const md = `---\ntitle: "My Page"\n---\n## Alpha\n\n${alpha}\n\n## Beta\n\n${beta}\n`;
    const chunks: Chunk[] = chunkPage({ page: "/tools/my_page/", markdown: md });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.title).toBe("My Page — Alpha");
    expect(chunks[0]!.text).toContain("## Alpha");
    expect(chunks[0]!.text).toContain("alpha words");
    expect(chunks[1]!.title).toBe("My Page — Beta");
    expect(chunks[1]!.text).not.toContain("alpha words");
  });

  it("strips frontmatter from chunk text", () => {
    const md = `---\ntitle: "Secret Front"\ndescription: "should not leak"\n---\nSome body content.\n`;
    const chunks: Chunk[] = chunkPage({ page: "/p/", markdown: md });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).not.toContain("title:");
    expect(chunks[0]!.text).not.toContain("should not leak");
    expect(chunks[0]!.text).toContain("Some body content.");
  });

  it("carries the page path into ids and chunk.page", () => {
    const md = `---\ntitle: "T"\n---\nHello world.`;
    const chunks: Chunk[] = chunkPage({ page: "/tools/get_plugin_traces/", markdown: md });
    expect(chunks[0]!.page).toBe("/tools/get_plugin_traces/");
    expect(chunks[0]!.id).toBe("/tools/get_plugin_traces/#0");
  });

  it("keeps chunks within the ~2500 char ceiling, falling back to paragraphs", () => {
    const bigSection = Array.from({ length: 12 }, (_, i) =>
      paragraph(`para${i} filler`, 600),
    ).join("\n\n");
    const md = `## Huge\n\n${bigSection}`;
    const chunks: Chunk[] = chunkPage({ page: "/big/", markdown: md, pageTitle: "Big" });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(2500);
      expect(chunk.title).toBe("Big — Huge");
    }
  });

  it("merges small adjacent sections instead of emitting one chunk per heading", () => {
    const md = ["## A", "short a", "## B", "short b", "## C", "short c"].join("\n\n");
    const chunks: Chunk[] = chunkPage({ page: "/small/", markdown: md, pageTitle: "S" });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toContain("short a");
    expect(chunks[0]!.text).toContain("short c");
  });

  it("does not treat # inside code fences as headings", () => {
    const md = "## Real\n\n```sh\n# not a heading\necho hi\n```\n\ntail text";
    const chunks: Chunk[] = chunkPage({ page: "/fence/", markdown: md, pageTitle: "F" });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.text).toContain("# not a heading");
  });
});
