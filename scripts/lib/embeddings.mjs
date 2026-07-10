// Embeddings abstraction for the "Ask AI" index build.
//
// Implemented against the Cloudflare Workers AI REST API with
// @cf/baai/bge-base-en-v1.5 — chosen as the cheapest option (Workers AI
// bge-base costs fractions of a cent per million tokens, and the ask worker
// can embed queries with the same model via its AI binding at runtime for
// effectively nothing).
//
// This is the single seam for the embedding provider: `embedTexts` is the
// only export the indexer uses, so swapping to an OpenAI-compatible
// /v1/embeddings endpoint later only means reimplementing this function
// (and updating EMBEDDING_MODEL + the worker-side query embedding).

export const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';

const BATCH_SIZE = 100; // Workers AI accepts up to 100 texts per call

/**
 * Embed a list of texts. Returns one vector per input text, in order.
 *
 * Requires CF_ACCOUNT_ID and CF_API_TOKEN (a token with Workers AI read
 * permission) in the environment.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(texts) {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error(
      'CF_ACCOUNT_ID and CF_API_TOKEN must be set to build the ask index.\n' +
        '  CF_ACCOUNT_ID: Cloudflare dashboard -> Workers & Pages -> account ID\n' +
        '  CF_API_TOKEN:  an API token with the "Workers AI - Read" permission\n' +
        'Example: CF_ACCOUNT_ID=... CF_API_TOKEN=... npm run build:ask-index',
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${EMBEDDING_MODEL}`;
  const vectors = [];
  for (let offset = 0; offset < texts.length; offset += BATCH_SIZE) {
    const batch = texts.slice(offset, offset + BATCH_SIZE);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ text: batch }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(
        `Workers AI embedding request failed (HTTP ${res.status}): ${detail.slice(0, 500)}`,
      );
    }
    const json = await res.json();
    if (!json.success || !Array.isArray(json.result?.data)) {
      throw new Error(
        `Workers AI embedding response malformed: ${JSON.stringify(json.errors ?? json).slice(0, 500)}`,
      );
    }
    if (json.result.data.length !== batch.length) {
      throw new Error(
        `Workers AI returned ${json.result.data.length} vectors for ${batch.length} texts`,
      );
    }
    vectors.push(...json.result.data);
  }
  return vectors;
}
