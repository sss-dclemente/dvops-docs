import { describe, expect, it } from "vitest";
import { encodeDelta, encodeDone, encodeError, encodeSseData } from "../src/sse";

describe("SSE encoder", () => {
  it("frames payloads as a single `data:` line terminated by a blank line", () => {
    const frame = encodeSseData({ a: 1 });
    expect(frame).toBe('data: {"a":1}\n\n');
  });

  it("encodes deltas", () => {
    expect(encodeDelta("Hello")).toBe('data: {"delta":"Hello"}\n\n');
  });

  it("keeps multiline deltas in one frame (newlines JSON-escaped)", () => {
    const frame = encodeDelta("line1\nline2");
    expect(frame.endsWith("\n\n")).toBe(true);
    // exactly one data line — the raw newline must not split the frame
    expect(frame.slice(0, -2).split("\n")).toHaveLength(1);
    expect(JSON.parse(frame.slice("data: ".length))).toEqual({ delta: "line1\nline2" });
  });

  it("encodes the final done event with sources and questionId", () => {
    const frame = encodeDone(["/tools/a/", "/security/"], 42);
    expect(frame.startsWith("data: ")).toBe(true);
    expect(frame.endsWith("\n\n")).toBe(true);
    expect(JSON.parse(frame.slice("data: ".length, -2))).toEqual({
      done: true,
      sources: ["/tools/a/", "/security/"],
      questionId: 42,
    });
  });

  it("encodes error frames", () => {
    expect(JSON.parse(encodeError("boom").slice("data: ".length))).toEqual({ error: "boom" });
  });
});
