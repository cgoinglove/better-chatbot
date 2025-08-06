import type { PubSub } from "./interface";
import { createPubSub } from "./create-pubsub";
import logger from "logger";

declare global {
  var __globalPubSub: PubSub | undefined;
}

/**
 * Get the global PubSub instance
 * Creates it on first access and reuses it afterwards
 * Uses globalThis to prevent duplicate instances in development
 */
export function getGlobalPubSub(): PubSub {
  if (!globalThis.__globalPubSub) {
    globalThis.__globalPubSub = createPubSub({
      autoReconnect: true,
      reconnectDelay: 5000,
      maxReconnectAttempts: 5,
    });

    process.on("SIGINT", closeGlobalPubSub);
    process.on("SIGTERM", closeGlobalPubSub);
  }

  return globalThis.__globalPubSub;
}

/**
 * Close the global PubSub instance
 * Useful for cleanup in tests or graceful shutdown
 */
export async function closeGlobalPubSub(): Promise<void> {
  if (globalThis.__globalPubSub) {
    try {
      await globalThis.__globalPubSub.close();
    } catch (error) {
      logger.error("Error closing global PubSub:", error);
    } finally {
      globalThis.__globalPubSub = undefined;
    }
  }
}
