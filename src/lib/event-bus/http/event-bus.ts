import type { BroadcastEvent, EventBus } from "../types";
import { generateUUID } from "lib/utils";
import { BASE_URL } from "lib/const";
import { registerEventBus } from "./handler";
import logger from "logger";
import { colorize } from "consola/utils";

/**
 * HTTP-based Event Bus Implementation
 *
 * TEMPORARY WORKAROUND FOR VERCEL:
 * This implementation uses HTTP requests to broadcast events between instances.
 * It's a hacky but functional solution for Vercel's serverless environment
 * where instances can't share memory or maintain persistent connections.
 *
 * WARNING: This is not suitable for high-frequency events or production at scale.
 * Consider migrating to proper infrastructure ASAP.
 */
export class HttpEventBus<T = any> implements EventBus<T> {
  private instanceId = generateUUID();
  private handlers: ((event: BroadcastEvent<T>) => Promise<void>)[] = [];
  private secret: string;
  private logger = logger.withDefaults({
    message: colorize(
      "magenta",
      `HTTP EventBus [${this.instanceId.slice(0, 8)}]: `,
    ),
  });

  constructor(
    private endpoint: string = "/api/internal/broadcast",
    secret?: string,
  ) {
    this.secret = secret || process.env.INTERNAL_SYNC_SECRET || generateUUID();
  }

  async init(): Promise<void> {
    this.logger.info("Initializing HTTP event bus");
    // Register this event bus to handle incoming broadcasts
    registerEventBus(this as any);
    this.logger.info("HTTP event bus registered for incoming broadcasts");
  }

  async publish(event: BroadcastEvent<T>): Promise<void> {
    // Skip if it's our own event
    if (event.instanceId === this.instanceId) {
      this.logger.debug("Skipping own event broadcast");
      return;
    }

    const url = `${BASE_URL}${this.endpoint}`;
    this.logger.info(`Broadcasting event: ${event.type}`);

    try {
      // Fire and forget - we don't wait for responses
      void fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Instance-ID": this.instanceId,
          "X-Sync-Secret": this.secret,
        },
        body: JSON.stringify(event),
      }).catch((error) => {
        this.logger.warn("Broadcast failed (ignoring):", error.message);
      });
    } catch (error) {
      this.logger.warn("Broadcast error (ignoring):", error);
    }
  }

  subscribe(handler: (event: BroadcastEvent<T>) => Promise<void>): void {
    this.handlers.push(handler);
    this.logger.info(`Subscribed handler (total: ${this.handlers.length})`);
  }

  /**
   * Handle incoming events from HTTP endpoint
   */
  async handleIncomingEvent(
    event: BroadcastEvent<T>,
    secret: string,
  ): Promise<void> {
    // Verify secret
    if (secret !== this.secret) {
      this.logger.error("Invalid sync secret received");
      throw new Error("Invalid sync secret");
    }

    // Skip our own events
    if (event.instanceId === this.instanceId) {
      this.logger.debug("Received own event, skipping");
      return;
    }

    this.logger.info(
      `Received event: ${event.type} from instance ${event.instanceId.slice(0, 8)}`,
    );

    // Notify all handlers
    const results = await Promise.allSettled(
      this.handlers.map((handler) => handler(event)),
    );

    const failedCount = results.filter((r) => r.status === "rejected").length;
    if (failedCount > 0) {
      this.logger.warn(
        `${failedCount}/${this.handlers.length} handlers failed`,
      );
    } else {
      this.logger.info(`Event processed by ${this.handlers.length} handlers`);
    }
  }

  async dispose(): Promise<void> {
    this.logger.info("Disposing HTTP event bus");
    this.handlers = [];
    // Note: We don't unregister from the global registry because
    // in serverless environments, instances are short-lived anyway
  }

  getInstanceId(): string {
    return this.instanceId;
  }
}
