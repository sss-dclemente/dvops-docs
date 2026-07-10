// Route handlers for the ask worker. Dependencies (AI binding, D1, the
// Anthropic client, the index and the rate limiter) are injected through
// narrow structural interfaces so tests can stub them; src/index.ts wires
// the real Cloudflare bindings in and stays thin.

import Anthropic from "@anthropic-ai/sdk";
import type { AskIndex } from "./types";
import { retrieve } from "./retrieval";
import { CLAUDE_MODEL, SYSTEM_PROMPT, buildUserContent } from "./prompt";
import { encodeDelta, encodeDone, encodeError } from "./sse";
import type { RateLimiter } from "./ratelimit";

export const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";
export const TOP_K = 6;
export const MAX_QUESTION_CHARS = 500;
export const MAX_ANSWER_TOKENS = 1500;

// --- injected dependency shapes (structural subsets of the real bindings) ---

export interface AiBinding {
  run(model: string, input: { text: string[] }): Promise<{ data: number[][] }>;
}

export interface D1RunResult {
  meta: { last_row_id: number; changes: number };
}

export interface DbBinding {
  prepare(sql: string): {
    bind(...values: unknown[]): { run(): Promise<D1RunResult> };
  };
}

export interface MessageStreamLike {
  on(event: "text", listener: (delta: string) => void): unknown;
  finalMessage(): Promise<unknown>;
}

export interface AnthropicLike {
  messages: {
    stream(params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: { role: "user"; content: string }[];
    }): MessageStreamLike;
  };
}

export interface AskDeps {
  ai: AiBinding;
  db: DbBinding;
  anthropic: AnthropicLike;
  index: AskIndex;
  limiter: RateLimiter;
}

// --- helpers ---

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Map Anthropic SDK typed errors to HTTP responses (spec: 429 / 502). */
export function anthropicErrorResponse(err: unknown): Response {
  if (err instanceof Anthropic.RateLimitError) {
    return json(429, {
      error: "upstream_rate_limited",
      detail: "The answer service is busy right now — please retry in a minute.",
    });
  }
  const detail =
    err instanceof Anthropic.APIError && err.message
      ? err.message
      : "Unexpected error from the answer service.";
  return json(502, { error: "upstream_error", detail });
}

// --- handlers ---

export function handleHealth(): Response {
  return json(200, { ok: true });
}

export async function handleAsk(request: Request, deps: AskDeps): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid_json", detail: "Body must be JSON." });
  }
  const rawQuestion = (body as { question?: unknown } | null)?.question;
  const question = typeof rawQuestion === "string" ? rawQuestion.trim() : "";
  if (question === "") {
    return json(400, { error: "question_required", detail: "Send { question: string }." });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return json(400, {
      error: "question_too_long",
      detail: `Questions are limited to ${MAX_QUESTION_CHARS} characters.`,
    });
  }

  // Rate limit by client IP (fixed window, per isolate — see ratelimit.ts).
  // The IP is used ONLY as the in-memory rate-limit key; it is never stored.
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (!deps.limiter.check(ip)) {
    return json(429, {
      error: "rate_limited",
      detail: "Too many questions — please wait a minute and try again.",
    });
  }

  // Embed the question with the same model that built the index.
  let queryVector: number[];
  try {
    const embedding = await deps.ai.run(EMBEDDING_MODEL, { text: [question] });
    queryVector = embedding.data[0] ?? [];
  } catch {
    return json(502, {
      error: "embedding_failed",
      detail: "Could not embed the question — please try again.",
    });
  }

  const chunks = retrieve(deps.index.chunks, queryVector, TOP_K);
  const answered = chunks.length > 0 ? 1 : 0;
  const sources = [...new Set(chunks.map((chunk) => chunk.page))];

  // Log the question for docs-gap analysis. Deliberately nothing personal:
  // no IP, no user agent — just the text, outcome and timestamp.
  let questionId: number | null = null;
  try {
    const result = await deps.db
      .prepare("INSERT INTO questions (question, answered, created_at) VALUES (?1, ?2, ?3)")
      .bind(question, answered, new Date().toISOString())
      .run();
    questionId = result.meta.last_row_id;
  } catch {
    // Logging is best-effort; keep answering even if D1 is unavailable.
  }

  const stream = deps.anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserContent(question, chunks) }],
  });

  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const sseBody = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c; // start() runs synchronously at construction
    },
  });
  let closed = false;
  const push = (frame: string) => {
    if (!closed) controller.enqueue(encoder.encode(frame));
  };
  const close = () => {
    if (!closed) {
      closed = true;
      controller.close();
    }
  };

  // Resolve once the stream produced output or failed, so upstream errors
  // that happen before any delta can still map to a proper HTTP status
  // (RateLimitError -> 429, other Anthropic errors -> 502). Failures after
  // headers are sent become an SSE error frame instead.
  let settleFirst!: (outcome: { ok: true } | { ok: false; err: unknown }) => void;
  const first = new Promise<{ ok: true } | { ok: false; err: unknown }>((resolve) => {
    settleFirst = resolve;
  });

  stream.on("text", (delta) => {
    settleFirst({ ok: true });
    push(encodeDelta(delta));
  });
  stream.finalMessage().then(
    () => {
      settleFirst({ ok: true });
      push(encodeDone(sources, questionId));
      close();
    },
    (err: unknown) => {
      settleFirst({ ok: false, err });
      push(encodeError("The answer stream failed — please try again."));
      close();
    },
  );

  const outcome = await first;
  if (!outcome.ok) return anthropicErrorResponse(outcome.err);

  return new Response(sseBody, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
    },
  });
}

export async function handleFeedback(
  request: Request,
  deps: { db: DbBinding },
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid_json", detail: "Body must be JSON." });
  }
  const { questionId, resolved } = (body ?? {}) as {
    questionId?: unknown;
    resolved?: unknown;
  };
  if (typeof questionId !== "number" || !Number.isInteger(questionId) || questionId <= 0) {
    return json(400, {
      error: "invalid_question_id",
      detail: "Send { questionId: number, resolved: boolean }.",
    });
  }
  if (typeof resolved !== "boolean") {
    return json(400, {
      error: "invalid_resolved",
      detail: "Send { questionId: number, resolved: boolean }.",
    });
  }

  let result: D1RunResult;
  try {
    result = await deps.db
      .prepare("UPDATE questions SET resolved = ?1 WHERE id = ?2")
      .bind(resolved ? 1 : 0, questionId)
      .run();
  } catch {
    return json(502, { error: "storage_failed", detail: "Could not record feedback." });
  }
  if (result.meta.changes === 0) {
    return json(404, { error: "question_not_found" });
  }
  return json(200, { ok: true });
}
