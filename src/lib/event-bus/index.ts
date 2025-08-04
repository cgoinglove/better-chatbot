import { IS_VERCEL_ENV } from "lib/const";
import type { EventBus } from "./types";
import { HttpEventBus } from "./http";

export * from "./types";
export * from "./http";

/**
 * Create an event bus based on environment
 *
 * TEMPORARY WORKAROUND FOR VERCEL:
 * This HTTP-based event bus is a temporary solution for Vercel's serverless
 * architecture where instances can't share memory. It's not ideal for production
 * but works as a stopgap until proper infrastructure (Redis/Kafka) is set up.
 *
 * TODO: Replace with proper message broker implementation:
 * - Redis Pub/Sub for small to medium scale
 * - Kafka/RabbitMQ for large scale
 * - AWS SQS/SNS for AWS deployments
 */
export function createEventBus<T = any>(): EventBus<T> {
  // For now, always use HTTP event bus
  // In the future, this can be extended to support Redis, Kafka, etc.
  // based on environment variables or configuration

  if (IS_VERCEL_ENV) {
    return new HttpEventBus<T>();
  }

  // Default to HTTP for now
  // Later can add:
  // if (process.env.REDIS_URL) return new RedisEventBus();
  // if (process.env.KAFKA_BROKERS) return new KafkaEventBus();

  return new NullEventBus<T>();
}

/**
 * Null event bus for testing or when event bus is not needed
 */
export class NullEventBus<T = any> implements EventBus<T> {
  async init(): Promise<void> {}
  async publish(): Promise<void> {}
  subscribe(): void {}
  async dispose(): Promise<void> {}
}
