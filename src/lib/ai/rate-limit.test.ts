import { describe, expect, it, vi } from "vitest";
import { AiRateLimiter, MemoryRateLimitStore } from "./rate-limit";

const createLimiter = (options: {
  perHour?: number;
  perDay?: number;
  role?: string;
  defaultPerDay?: number;
}) => {
  return new AiRateLimiter({
    redisUrl: "redis://example.com",
    limitsByRole: options.role
      ? { [options.role]: { perHour: options.perHour, perDay: options.perDay } }
      : {},
    defaultLimits: options.defaultPerDay
      ? { perDay: options.defaultPerDay, perHour: options.perHour }
      : { perHour: options.perHour, perDay: options.perDay },
    store: new MemoryRateLimitStore(),
  });
};

describe("AiRateLimiter", () => {
  it("allows requests under the limit", async () => {
    const limiter = createLimiter({ perHour: 2, role: "user" });
    const userId = "user-1";

    const first = await limiter.check(userId, "user");
    const second = await limiter.check(userId, "user");

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("blocks when hourly limit exceeded", async () => {
    const limiter = createLimiter({ perHour: 1, role: "user" });
    const userId = "user-2";

    await limiter.check(userId, "user");
    const blocked = await limiter.check(userId, "user");

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.window).toBe("hour");
      expect(blocked.limit).toBe(1);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("resets after window expires", async () => {
    const realNow = Date.now;
    let now = realNow();
    // Override Date.now to simulate time passing without timers API
    Date.now = () => now;

    try {
      const limiter = createLimiter({ perHour: 1, role: "user" });
      const userId = "user-3";

      await limiter.check(userId, "user");
      const blocked = await limiter.check(userId, "user");
      expect(blocked.ok).toBe(false);

      // Advance just over one hour
      now = now + 60 * 60 * 1000 + 10;

      const allowedAgain = await limiter.check(userId, "user");
      expect(allowedAgain.ok).toBe(true);
    } finally {
      Date.now = realNow;
    }
  });

  it("applies daily limit when configured", async () => {
    const limiter = createLimiter({ perHour: 0, perDay: 2, role: "editor" });
    const userId = "user-4";

    await limiter.check(userId, "editor");
    await limiter.check(userId, "editor");
    const blocked = await limiter.check(userId, "editor");

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.window).toBe("day");
      expect(blocked.limit).toBe(2);
    }
  });

  it("uses default limits when role not configured", async () => {
    const limiter = createLimiter({ perHour: 0, defaultPerDay: 1 });
    const userId = "user-5";

    await limiter.check(userId, "unknown");
    const blocked = await limiter.check(userId, "unknown");

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.window).toBe("day");
      expect(blocked.limit).toBe(1);
    }
  });
});
