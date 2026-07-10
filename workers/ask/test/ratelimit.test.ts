import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../src/ratelimit";

describe("createRateLimiter", () => {
  it("allows up to the limit within a window, then blocks", () => {
    const limiter = createRateLimiter(10, 60_000);
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i++) {
      expect(limiter.check("ip-1", t0 + i * 100)).toBe(true);
    }
    expect(limiter.check("ip-1", t0 + 5_000)).toBe(false);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("a", 0)).toBe(true);
    expect(limiter.check("a", 1)).toBe(false);
    expect(limiter.check("b", 2)).toBe(true);
  });

  it("resets after the window elapses", () => {
    const limiter = createRateLimiter(2, 60_000);
    expect(limiter.check("ip", 0)).toBe(true);
    expect(limiter.check("ip", 1)).toBe(true);
    expect(limiter.check("ip", 2)).toBe(false);
    expect(limiter.check("ip", 60_000)).toBe(true);
  });
});
