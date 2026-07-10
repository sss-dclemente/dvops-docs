import { describe, expect, it } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import {
  handleAsk,
  handleFeedback,
  handleHealth,
  type AnthropicLike,
  type AskDeps,
  type MessageStreamLike,
} from "../src/handlers";
import { createRateLimiter } from "../src/ratelimit";
import type { AskIndex } from "../src/types";

// --- stubs -----------------------------------------------------------------

const INDEX: AskIndex = {
  model: "@cf/baai/bge-base-en-v1.5",
  dims: 3,
  chunks: [
    { id: "a#0", page: "/tools/a/", title: "A", text: "alpha docs", vector: [1, 0, 0] },
    { id: "b#0", page: "/tools/b/", title: "B", text: "beta docs", vector: [0.9, 0.1, 0] },
    { id: "c#0", page: "/security/", title: "C", text: "gamma docs", vector: [0, 1, 0] },
  ],
};

function makeAi(vector: number[] = [1, 0, 0]) {
  const calls: { model: string; input: { text: string[] } }[] = [];
  return {
    calls,
    run: async (model: string, input: { text: string[] }) => {
      calls.push({ model, input });
      return { data: [vector] };
    },
  };
}

function makeDb(overrides: { changes?: number; fail?: boolean } = {}) {
  const calls: { sql: string; values: unknown[] }[] = [];
  return {
    calls,
    prepare(sql: string) {
      return {
        bind: (...values: unknown[]) => ({
          run: async () => {
            if (overrides.fail) throw new Error("d1 down");
            calls.push({ sql, values });
            return { meta: { last_row_id: 42, changes: overrides.changes ?? 1 } };
          },
        }),
      };
    },
  };
}

function makeAnthropic(opts: { deltas?: string[]; error?: unknown } = {}): {
  client: AnthropicLike;
  params: unknown[];
} {
  const params: unknown[] = [];
  const client: AnthropicLike = {
    messages: {
      stream(p) {
        params.push(p);
        const textListeners: ((delta: string) => void)[] = [];
        const stream: MessageStreamLike = {
          on(event, listener) {
            if (event === "text") textListeners.push(listener);
            return stream;
          },
          finalMessage() {
            return new Promise((resolve, reject) => {
              queueMicrotask(() => {
                if (opts.error) return reject(opts.error);
                for (const delta of opts.deltas ?? ["Hello", " world"]) {
                  for (const listener of textListeners) listener(delta);
                }
                resolve({});
              });
            });
          },
        };
        return stream;
      },
    },
  };
  return { client, params };
}

function deps(overrides: Partial<AskDeps> = {}): AskDeps {
  return {
    ai: makeAi(),
    db: makeDb(),
    anthropic: makeAnthropic().client,
    index: INDEX,
    limiter: createRateLimiter(10, 60_000),
    ...overrides,
  };
}

function askRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://ask.example/v1/ask", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function parseFrames(sseText: string): Record<string, unknown>[] {
  return sseText
    .split("\n\n")
    .filter((frame) => frame.startsWith("data: "))
    .map((frame) => JSON.parse(frame.slice("data: ".length)));
}

// --- tests -------------------------------------------------------------------

describe("handleHealth", () => {
  it("returns ok", async () => {
    const res = handleHealth();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("handleAsk", () => {
  it("streams deltas then a done event with sources and questionId", async () => {
    const db = makeDb();
    const res = await handleAsk(
      askRequest({ question: "How do I filter traces?" }),
      deps({ db }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");

    const frames = parseFrames(await res.text());
    expect(frames[0]).toEqual({ delta: "Hello" });
    expect(frames[1]).toEqual({ delta: " world" });
    const done = frames.at(-1)!;
    expect(done.done).toBe(true);
    expect(done.questionId).toBe(42);
    // Sources are the retrieved pages, deduped, best match first.
    expect(done.sources).toEqual(["/tools/a/", "/tools/b/", "/security/"]);
  });

  it("inserts the question row without any IP or user-agent data", async () => {
    const db = makeDb();
    const request = askRequest(
      { question: "What about async jobs?" },
      { "CF-Connecting-IP": "203.0.113.9", "user-agent": "SecretBrowser/1.0" },
    );
    const res = await handleAsk(request, deps({ db }));
    await res.text();

    expect(db.calls).toHaveLength(1);
    const insert = db.calls[0]!;
    expect(insert.sql).toMatch(/^INSERT INTO questions \(question, answered, created_at\)/);
    expect(insert.sql.toLowerCase()).not.toMatch(/ip|user_agent|agent/);
    // exactly question text, answered flag, ISO timestamp — nothing else
    expect(insert.values).toHaveLength(3);
    expect(insert.values[0]).toBe("What about async jobs?");
    expect(insert.values[1]).toBe(1);
    expect(String(insert.values[2])).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(JSON.stringify(insert.values)).not.toContain("203.0.113.9");
    expect(JSON.stringify(insert.values)).not.toContain("SecretBrowser");
  });

  it("sends the question + retrieved chunks to Claude with the system prompt", async () => {
    const anthropic = makeAnthropic();
    const res = await handleAsk(
      askRequest({ question: "Q?" }),
      deps({ anthropic: anthropic.client }),
    );
    await res.text();

    const params = anthropic.params[0] as {
      model: string;
      max_tokens: number;
      system: string;
      messages: { role: string; content: string }[];
    };
    expect(params.model).toBe("claude-sonnet-4-6");
    expect(params.max_tokens).toBe(1500);
    expect(params.system).toContain("support@simplesmoothsafe.com");
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0]!.content).toContain("Q?");
    // all 3 index chunks fit within top-6
    expect(params.messages[0]!.content.match(/<doc page="/g)).toHaveLength(3);
  });

  it("rejects missing or non-string questions with 400", async () => {
    expect((await handleAsk(askRequest({}), deps())).status).toBe(400);
    expect((await handleAsk(askRequest({ question: 7 }), deps())).status).toBe(400);
    expect((await handleAsk(askRequest("not json{"), deps())).status).toBe(400);
  });

  it("rejects questions over 500 characters with 400", async () => {
    const res = await handleAsk(askRequest({ question: "x".repeat(501) }), deps());
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("question_too_long");
  });

  it("rate limits the 11th request in a minute from one IP with 429", async () => {
    const shared = deps(); // one limiter across requests
    const headers = { "CF-Connecting-IP": "198.51.100.7" };
    for (let i = 0; i < 10; i++) {
      const res = await handleAsk(askRequest({ question: `q${i}` }, headers), shared);
      expect(res.status).toBe(200);
      await res.text();
    }
    const eleventh = await handleAsk(askRequest({ question: "q10" }, headers), shared);
    expect(eleventh.status).toBe(429);
    // a different IP is not affected
    const other = await handleAsk(
      askRequest({ question: "other" }, { "CF-Connecting-IP": "198.51.100.8" }),
      shared,
    );
    expect(other.status).toBe(200);
    await other.text();
  });

  it("maps Anthropic RateLimitError to HTTP 429", async () => {
    const err = Object.create(Anthropic.RateLimitError.prototype) as Error;
    const res = await handleAsk(
      askRequest({ question: "q" }),
      deps({ anthropic: makeAnthropic({ error: err }).client }),
    );
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: string }).error).toBe("upstream_rate_limited");
  });

  it("maps other Anthropic errors to a 502 JSON envelope", async () => {
    const err = Object.assign(Object.create(Anthropic.APIError.prototype), {
      message: "overloaded",
    }) as Error;
    const res = await handleAsk(
      askRequest({ question: "q" }),
      deps({ anthropic: makeAnthropic({ error: err }).client }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream_error", detail: "overloaded" });
  });

  it("still answers when the D1 insert fails (questionId null)", async () => {
    const res = await handleAsk(
      askRequest({ question: "q" }),
      deps({ db: makeDb({ fail: true }) }),
    );
    expect(res.status).toBe(200);
    const done = parseFrames(await res.text()).at(-1)!;
    expect(done.done).toBe(true);
    expect(done.questionId).toBeNull();
  });
});

describe("handleFeedback", () => {
  it("updates resolved to 1 for thumbs up", async () => {
    const db = makeDb();
    const res = await handleFeedback(
      askRequest({ questionId: 42, resolved: true }),
      { db },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.calls[0]!.sql).toMatch(/^UPDATE questions SET resolved = \?1 WHERE id = \?2$/);
    expect(db.calls[0]!.values).toEqual([1, 42]);
  });

  it("updates resolved to 0 for thumbs down", async () => {
    const db = makeDb();
    await handleFeedback(askRequest({ questionId: 7, resolved: false }), { db });
    expect(db.calls[0]!.values).toEqual([0, 7]);
  });

  it("404s when the question does not exist", async () => {
    const res = await handleFeedback(
      askRequest({ questionId: 999, resolved: true }),
      { db: makeDb({ changes: 0 }) },
    );
    expect(res.status).toBe(404);
  });

  it("rejects invalid payloads with 400", async () => {
    const db = makeDb();
    expect((await handleFeedback(askRequest({}), { db })).status).toBe(400);
    expect(
      (await handleFeedback(askRequest({ questionId: "x", resolved: true }), { db })).status,
    ).toBe(400);
    expect(
      (await handleFeedback(askRequest({ questionId: 1, resolved: "yes" }), { db })).status,
    ).toBe(400);
    expect(db.calls).toHaveLength(0);
  });
});
