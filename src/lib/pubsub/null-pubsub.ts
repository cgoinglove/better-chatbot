import { colorize } from "consola/utils";
import type { PubSub } from "./interface";
import type {
  MessageHandler,
  PubSubConfig,
  ConnectionStatus,
} from "./interface";
import globalLogger from "logger";

/**
 * No-operation PubSub implementation
 *
 * Useful for:
 * - Testing environments where PubSub is not needed
 * - Disabling PubSub functionality
 * - Fallback when other implementations fail
 */
export class NullPubSub implements PubSub {
  private subscriptions = new Set<string>();
  private logger = globalLogger.withDefaults({
    message: colorize("bgWhite", "PubSub: "),
  });

  constructor(private config: PubSubConfig = {}) {
    if (config.debug) {
      this.logger.debug(
        "NullPubSub initialized - all operations will be no-ops",
      );
    }
  }

  async subscribe<T = any>(
    channel: string,
    _handler: MessageHandler<T>,
  ): Promise<void> {
    this.subscriptions.add(channel);
    if (this.config.debug) {
      this.logger.debug(`Subscribed to channel: ${channel} (no-op)`);
    }
  }

  async publish<T = any>(channel: string, message: T): Promise<void> {
    if (this.config.debug) {
      this.logger.debug(`Published to channel: ${channel} (no-op)`, message);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    this.subscriptions.delete(channel);
    if (this.config.debug) {
      this.logger.debug(`Unsubscribed from channel: ${channel} (no-op)`);
    }
  }

  async close(): Promise<void> {
    this.subscriptions.clear();
    if (this.config.debug) {
      this.logger.debug("PubSub closed (no-op)");
    }
  }

  getStatus(): ConnectionStatus {
    return "connected";
  }

  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  isSubscribed(channel: string): boolean {
    return this.subscriptions.has(channel);
  }
}
