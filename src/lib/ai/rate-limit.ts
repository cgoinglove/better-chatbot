import Redis from "ioredis";
import logger from "logger";
import { RateLimitMessagePayload } from "./rate-limit-message";

export type RateLimitCheckResult =
  | { ok: true }
  | ({ ok: false } & RateLimitMessagePayload);

export interface RateLimitConfig {
  perHour?: number;
  perDay?: number;
}

export interface RateLimitOptions {
  redisUrl: string;
  limitsByRole?: Record<string, RateLimitConfig>;
  defaultLimits?: RateLimitConfig;
}

interface RateLimitStore {
  increment(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; ttlMs: number }>;
}

class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      // Allow brief disconnects without throwing "stream isn't writeable"
      enableOfflineQueue: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      commandTimeout: 5000,
    });
  }

  async increment(key: string, windowMs: number) {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.pexpire(key, windowMs);
    }
    const ttlMs = await this.redis.pttl(key);
    return { count, ttlMs };
  }
}

export class AiRateLimiter {
  private store: RateLimitStore;
  private limitsByRole: Record<string, RateLimitConfig>;
  private defaultLimits?: RateLimitConfig;

  constructor(options: RateLimitOptions & { store?: RateLimitStore }) {
    if (!options.redisUrl) {
      throw new Error("Redis URL is required for AI rate limiting");
    }
    this.limitsByRole = this.sanitizeLimits(options.limitsByRole ?? {});
    this.defaultLimits = this.sanitizeLimits({
      default: options.defaultLimits ?? {},
    }).default;
    this.store = options.store ?? new RedisRateLimitStore(options.redisUrl);
  }

  private safeLimit(limit?: number) {
    if (!limit || limit <= 0 || !Number.isFinite(limit)) return undefined;
    return Math.floor(limit);
  }

  private sanitizeLimits(limits: Record<string, RateLimitConfig>) {
    return Object.entries(limits).reduce<Record<string, RateLimitConfig>>(
      (acc, [role, config]) => {
        const perHour = this.safeLimit(config.perHour);
        const perDay = this.safeLimit(config.perDay);
        if (perHour || perDay) {
          acc[role.toLowerCase()] = { perHour, perDay };
        }
        return acc;
      },
      {},
    );
  }

  private async checkWindow(
    userId: string,
    window: "hour" | "day",
    limit: number,
  ): Promise<RateLimitCheckResult> {
    const windowMs = window === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const key = `ai:rate:${window}:${userId}`;
    const { count, ttlMs } = await this.store.increment(key, windowMs);

    if (count > limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
      logger.warn(
        `AI rate limit exceeded: user=${userId} window=${window} limit=${limit} count=${count}`,
      );
      return {
        ok: false,
        window,
        retryAfterSeconds,
        limit,
      };
    }

    return { ok: true } as const;
  }

  async check(userId: string, role?: string): Promise<RateLimitCheckResult> {
    const roleKey = (role ?? "").toLowerCase();
    const limits = this.limitsByRole[roleKey] || this.defaultLimits;

    if (!limits || (!limits.perHour && !limits.perDay)) {
      return { ok: true } as const;
    }

    if (limits.perHour) {
      const result = await this.checkWindow(userId, "hour", limits.perHour);
      if (!result.ok) return result;
    }

    if (limits.perDay) {
      const result = await this.checkWindow(userId, "day", limits.perDay);
      if (!result.ok) return result;
    }

    return { ok: true } as const;
  }
}

let limiter: AiRateLimiter | null = null;

export const getAiRateLimiter = () => {
  if (limiter) return limiter;

  const redisUrl = process.env.REDIS_URL;
  const roles = ["USER", "EDITOR", "ADMIN"] as const;

  const readLimit = (role: string, window: "HOUR" | "DAY") => {
    const value = process.env[`AI_RATE_LIMIT_${role}_PER_${window}`];
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : undefined;
  };

  const limitsByRole = roles.reduce<Record<string, RateLimitConfig>>(
    (acc, role) => {
      const perHour = readLimit(role, "HOUR");
      const perDay = readLimit(role, "DAY");
      if (perHour || perDay) {
        acc[role.toLowerCase()] = { perHour, perDay };
      }
      return acc;
    },
    {},
  );

  const defaultPerHour = Number(process.env.AI_RATE_LIMIT_PER_HOUR ?? "0");
  const defaultPerDay = Number(process.env.AI_RATE_LIMIT_PER_DAY ?? "0");

  const isEnabled = Boolean(
    redisUrl &&
      (Object.keys(limitsByRole).length > 0 ||
        defaultPerHour > 0 ||
        defaultPerDay > 0),
  );
  if (!isEnabled) return null;

  limiter = new AiRateLimiter({
    redisUrl: redisUrl!,
    limitsByRole,
    defaultLimits: {
      perHour: defaultPerHour,
      perDay: defaultPerDay,
    },
  });
  return limiter;
};

// Exported for testing
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; expiresAt: number }>();

  async increment(key: string, windowMs: number) {
    const now = Date.now();
    const existing = this.store.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.store.set(key, { count: 1, expiresAt: now + windowMs });
      return { count: 1, ttlMs: windowMs };
    }
    const next = { count: existing.count + 1, expiresAt: existing.expiresAt };
    this.store.set(key, next);
    return { count: next.count, ttlMs: next.expiresAt - now };
  }
}
