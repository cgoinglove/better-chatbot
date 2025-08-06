/**
 * Message handler function type for PubSub subscriptions
 */
export type MessageHandler<T = any> = (message: T) => void | Promise<void>;

/**
 * PubSub message with metadata
 */
export interface PubSubMessage<T = any> {
  channel: string;
  data: T;
  timestamp: number;
  processId?: number;
}

/**
 * Configuration options for PubSub implementations
 */
export interface PubSubConfig {
  /**
   * Auto-reconnect on connection loss
   */
  autoReconnect?: boolean;

  /**
   * Reconnection delay in milliseconds
   */
  reconnectDelay?: number;

  /**
   * Maximum reconnection attempts
   */
  maxReconnectAttempts?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Subscription information
 */
export interface Subscription {
  channel: string;
  handler: MessageHandler;
  active: boolean;
}

/**
 * PubSub connection status
 */
export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

/**
 * Generic PubSub interface for inter-process communication
 *
 * This interface can be implemented with various backends:
 * - PostgreSQL LISTEN/NOTIFY
 * - Redis Pub/Sub
 * - Node.js cluster process.send()
 * - HTTP webhooks
 * - Apache Kafka
 * - RabbitMQ
 * - In-memory (for testing)
 */
export interface PubSub {
  /**
   * Subscribe to a channel with a message handler
   * @param channel - Channel name to subscribe to
   * @param handler - Function to handle incoming messages
   */
  subscribe<T = any>(
    channel: string,
    handler: MessageHandler<T>,
  ): Promise<void>;

  /**
   * Publish a message to a channel
   * @param channel - Channel name to publish to
   * @param message - Message data to publish
   */
  publish<T = any>(channel: string, message: T): Promise<void>;

  /**
   * Unsubscribe from a channel
   * @param channel - Channel name to unsubscribe from
   */
  unsubscribe(channel: string): Promise<void>;

  /**
   * Unsubscribe from all channels and close connections
   */
  close(): Promise<void>;

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus;

  /**
   * Get list of subscribed channels
   */
  getSubscriptions(): string[];

  /**
   * Check if subscribed to a specific channel
   * @param channel - Channel name to check
   */
  isSubscribed(channel: string): boolean;
}
