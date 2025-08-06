import { createClient, RedisClientType } from "redis";
import type { PubSub } from "./interface";
import type {
  MessageHandler,
  PubSubConfig,
  ConnectionStatus,
  Subscription,
} from "./interface";
import globalLogger from "logger";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";

/**
 * Redis PubSub implementation
 *
 * Uses Redis Pub/Sub for inter-process communication
 * Requires two separate Redis connections: one for subscribing, one for publishing
 */
export class RedisPubSub implements PubSub {
  private subscriber: RedisClientType | null = null;
  private publisher: RedisClientType | null = null;
  private subscriptions = new Map<string, Subscription>();
  private status: ConnectionStatus = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private connecting = false;
  private maxAttemptsReached = false;
  private logger = globalLogger.withDefaults({
    message: colorize("bgWhite", `redis-pubsub-${generateUUID().slice(0, 4)}`),
  });

  constructor(
    private connectionUrl: string,
    private config: PubSubConfig = {},
  ) {
    // Set default config values - preserve passed config
    this.config = {
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      debug: false,
      ...config, // User config should override defaults
    };

    // Don't register process handlers here - let global.ts handle it
  }

  /**
   * Initialize Redis connections
   */
  private async connect(): Promise<void> {
    // If max attempts reached, don't try again
    if (this.maxAttemptsReached) {
      throw new Error("Redis connection permanently failed after max attempts");
    }

    // Prevent concurrent connection attempts
    if (this.connecting) {
      return;
    }

    if (this.status === "connected" && this.subscriber && this.publisher) {
      return;
    }

    this.connecting = true;

    try {
      this.status = "reconnecting";

      // Create subscriber connection with auto-retry disabled
      this.subscriber = createClient({
        url: this.connectionUrl,
        socket: {
          reconnectStrategy: false, // Disable Redis client auto-reconnection
        },
      });
      this.subscriber.on("error", this.handleError.bind(this));
      this.subscriber.on("end", this.handleEnd.bind(this));
      await this.subscriber.connect();

      // Create publisher connection with auto-retry disabled
      this.publisher = createClient({
        url: this.connectionUrl,
        socket: {
          reconnectStrategy: false, // Disable Redis client auto-reconnection
        },
      });
      this.publisher.on("error", (err) => {
        this.logger.error("Redis publisher error:", err);
      });
      await this.publisher.connect();

      this.status = "connected";
      this.reconnectAttempts = 0;

      // Re-subscribe to all channels after reconnection
      await this.resubscribeAll();
    } catch (error) {
      this.status = "error";
      this.logger.error("Failed to connect to Redis:", error);

      if (
        this.config.autoReconnect &&
        this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)
      ) {
        this.scheduleReconnect();
      } else {
        // Mark as permanently failed
        this.maxAttemptsReached = true;
        this.status = "disconnected";
      }

      throw error;
    } finally {
      this.connecting = false;
    }
  }

  /**
   * Handle connection errors
   */
  private handleError(error: Error): void {
    this.logger.error("Redis connection error:", error);
    this.status = "error";

    if (this.shouldReconnect()) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection end
   */
  private handleEnd(): void {
    this.status = "disconnected";

    if (this.shouldReconnect()) {
      this.scheduleReconnect();
    }
  }

  /**
   * Check if reconnection should be attempted
   */
  private shouldReconnect(): boolean {
    return (
      this.config.autoReconnect === true &&
      !this.maxAttemptsReached &&
      this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)
    );
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;

    // Check if we've exceeded max attempts
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      this.logger.error(
        `Max reconnection attempts (${this.config.maxReconnectAttempts}) reached. Giving up.`,
      );
      this.maxAttemptsReached = true;
      this.status = "disconnected";
      return;
    }

    const delay = this.config.reconnectDelay || 1000;

    if (this.config.debug) {
      this.logger.debug(
        `Scheduling reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`,
      );
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Error already logged in connect()
      });
    }, delay);
  }

  /**
   * Re-subscribe to all channels after reconnection
   */
  private async resubscribeAll(): Promise<void> {
    const channels = Array.from(this.subscriptions.keys());

    if (channels.length === 0 || !this.subscriber) {
      return;
    }

    for (const [channel] of this.subscriptions) {
      try {
        await this.subscriber.subscribe(channel, (message) => {
          this.handleMessage(channel, message);
        });
      } catch (error) {
        this.logger.error(
          `Failed to re-subscribe to channel ${channel}:`,
          error,
        );
      }
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(channel: string, message: string): void {
    const subscription = this.subscriptions.get(channel);
    if (!subscription || !subscription.active) {
      return;
    }

    try {
      // Parse message
      const data = JSON.parse(message);

      // Call the handler
      const result = subscription.handler(data);
      if (result instanceof Promise) {
        result.catch((error) => {
          this.logger.error(
            `Error in message handler for channel ${channel}:`,
            error,
          );
        });
      }
    } catch (error) {
      this.logger.error(
        `Error processing message for channel ${channel}:`,
        error,
      );
    }
  }

  // Public PubSub interface methods

  async subscribe<T = any>(
    channel: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    if (this.maxAttemptsReached) {
      throw new Error("Redis connection permanently failed. Cannot subscribe.");
    }

    if (this.status !== "connected") {
      await this.connect();
    }

    if (!this.subscriber || this.status !== "connected") {
      throw new Error("Redis connection not available for subscription.");
    }

    if (this.subscriptions.has(channel)) {
      // Update handler for existing subscription
      const subscription = this.subscriptions.get(channel)!;
      subscription.handler = handler as MessageHandler;
      return;
    }

    try {
      // Subscribe to Redis channel
      await this.subscriber.subscribe(channel, (message) => {
        this.handleMessage(channel, message);
      });

      // Store subscription
      this.subscriptions.set(channel, {
        channel,
        handler: handler as MessageHandler,
        active: true,
      });
    } catch (error) {
      this.logger.error(`Failed to subscribe to channel ${channel}:`, error);
      throw error;
    }
  }

  async publish<T = any>(channel: string, message: T): Promise<void> {
    if (this.maxAttemptsReached) {
      throw new Error("Redis connection permanently failed. Cannot publish.");
    }

    if (this.status !== "connected") {
      await this.connect();
    }

    if (!this.publisher || this.status !== "connected") {
      throw new Error("Redis connection not available for publishing.");
    }

    try {
      const payload = JSON.stringify(message);
      if (this.config.debug) {
        this.logger.debug(`Publishing to channel ${channel}:`, payload);
      }
      await this.publisher.publish(channel, payload);
    } catch (error) {
      this.logger.error(`Failed to publish to channel ${channel}:`, error);
      throw error;
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    const subscription = this.subscriptions.get(channel);
    if (!subscription) {
      return;
    }

    try {
      // Unsubscribe from Redis channel
      if (this.subscriber && this.status === "connected") {
        await this.subscriber.unsubscribe(channel);
      }

      // Remove subscription
      this.subscriptions.delete(channel);
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe from channel ${channel}:`,
        error,
      );
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.status === "disconnected") {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this.subscriptions.clear();

    // Close Redis connections
    if (this.subscriber) {
      try {
        await this.subscriber.quit();
      } catch (error) {
        this.logger.debug("Subscriber close error:", error);
      }
      this.subscriber = null;
    }

    if (this.publisher) {
      try {
        await this.publisher.quit();
      } catch (error) {
        this.logger.debug("Publisher close error:", error);
      }
      this.publisher = null;
    }

    this.status = "disconnected";
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  isSubscribed(channel: string): boolean {
    return this.subscriptions.has(channel);
  }
}
