import type { IndexChunk } from "./types";

/**
 * Cosine similarity between two vectors. Returns 0 when either vector has
 * zero magnitude (never NaN), and tolerates mismatched lengths by comparing
 * the shared prefix.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Pure top-k retrieval over the bundled index: returns the k chunks most
 * similar to the query vector, best first. k larger than the index size
 * simply returns everything.
 */
export function retrieve(
  chunks: IndexChunk[],
  queryVector: number[],
  k: number,
): IndexChunk[] {
  return chunks
    .map((chunk) => ({ chunk, score: cosineSimilarity(chunk.vector, queryVector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, k))
    .map((entry) => entry.chunk);
}
