import { describe, expect, it } from "vitest";
import { cosineSimilarity, retrieve } from "../src/retrieval";
import type { IndexChunk } from "../src/types";

function chunk(id: string, vector: number[]): IndexChunk {
  return { id, page: `/${id}/`, title: id, text: `text for ${id}`, vector };
}

describe("cosineSimilarity", () => {
  it("is 1 for identical direction and 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 5])).toBeCloseTo(0);
  });

  it("returns 0 (not NaN) for zero vectors", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], [0, 0])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
});

describe("retrieve", () => {
  const chunks = [
    chunk("orthogonal", [0, 1, 0]),
    chunk("exact", [1, 0, 0]),
    chunk("close", [0.9, 0.1, 0]),
    chunk("far", [-1, 0, 0]),
  ];

  it("returns the top-k chunks ordered by cosine similarity, best first", () => {
    const top = retrieve(chunks, [1, 0, 0], 2);
    expect(top.map((c) => c.id)).toEqual(["exact", "close"]);
  });

  it("returns everything (still ordered) when k exceeds the index size", () => {
    const top = retrieve(chunks, [1, 0, 0], 100);
    expect(top).toHaveLength(chunks.length);
    expect(top.map((c) => c.id)).toEqual(["exact", "close", "orthogonal", "far"]);
  });

  it("is safe with a zero query vector — no NaN ordering crash", () => {
    const top = retrieve(chunks, [0, 0, 0], 3);
    expect(top).toHaveLength(3);
  });

  it("is safe with zero-vector chunks in the index", () => {
    const withZero = [...chunks, chunk("zero", [0, 0, 0])];
    const top = retrieve(withZero, [1, 0, 0], withZero.length);
    expect(top[0]!.id).toBe("exact");
    // the zero-vector chunk scores 0, below the positive matches
    expect(top.indexOf(withZero[4]!)).toBeGreaterThan(1);
  });

  it("returns an empty array for k <= 0", () => {
    expect(retrieve(chunks, [1, 0, 0], 0)).toEqual([]);
  });
});
