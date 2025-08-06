import type { PubSub, PubSubConfig } from "./interface";
import { RedisPubSub } from "./redis-pubsub";
import { NullPubSub } from "./null-pubsub";

export interface CreatePubSubOptions extends PubSubConfig {
  /**
   * Force a specific PubSub implementation
   * If not provided, will auto-detect based on environment
   */
  type?: "redis" | "null";
}

/**
 * Create a PubSub instance based on environment configuration
 *
 * Priority order:
 * 1. Explicit type parameter
 * 2. REDIS_URL environment variable -> Redis
 * 3. Default to NullPubSub
 */
export function createPubSub(options: CreatePubSubOptions = {}): PubSub {
  // If type is explicitly specified, use it
  if (options.type) {
    switch (options.type) {
      case "redis":
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
          throw new Error(
            "REDIS_URL environment variable is required for Redis PubSub",
          );
        }
        return new RedisPubSub(redisUrl, options);

      default:
        return new NullPubSub(options);
    }
  }

  // Auto-detect based on environment
  const redisUrl = process.env.REDIS_URL;

  // Use Redis if available
  if (redisUrl) {
    return new RedisPubSub(redisUrl, options);
  }

  return new NullPubSub(options);
}
