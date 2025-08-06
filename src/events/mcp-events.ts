/**
 * MCP Event System - Service Level Events
 *
 * MCP event management for inter-instance communication
 * Handles server add, remove, and refresh events
 */

import { randomUUID } from "crypto";
import globalLogger from "logger";
import { PubSub } from "lib/pubsub/interface";
import { getGlobalPubSub } from "lib/pubsub/global";
import { colorize } from "consola/utils";

// Event types
export type MCPEventType = "add" | "remove" | "refresh";

// Event data structure
export interface MCPEventData {
  id: string;
  type: MCPEventType;
  serverId: string;
  processId: number;
  timestamp: number;
  data?: Record<string, any>;
}

// Event handler type
export type MCPEventHandler = (data: MCPEventData) => void | Promise<void>;

// Configuration
export interface MCPEventConfig {
  debug?: boolean;
  enableMetrics?: boolean;
  pubsub?: PubSub; // For testing only
}

/**
 * MCP Event Manager
 */
export class MCPEventManager {
  private pubsub: PubSub;
  private handlers = new Map<MCPEventType, Set<MCPEventHandler>>();
  private subscribed = new Set<MCPEventType>();
  private metrics = { published: 0, received: 0, errors: 0 };
  private logger = globalLogger.withDefaults({
    message: colorize("bgWhite", "mcp-event: "),
  });
  private cleanupCallbacks: (() => void)[] = [];

  constructor(config: MCPEventConfig = {}) {
    // Initialize PubSub backend
    if (config.pubsub) {
      // Use provided PubSub (for testing)
      this.pubsub = config.pubsub;
    } else {
      // Use global PubSub instance
      this.pubsub = getGlobalPubSub();
    }
  }

  /**
   * Subscribe to MCP events
   */
  on(eventType: MCPEventType, handler: MCPEventHandler): () => void {
    // Add handler
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Subscribe to PubSub channel if first handler (with race condition protection)
    if (!this.subscribed.has(eventType)) {
      this.subscribed.add(eventType);
      const channel = `mcp_${eventType}`;

      this.pubsub
        .subscribe(channel, (data: MCPEventData) => {
          this.handleEvent(eventType, data);
        })
        .catch((error) => {
          // Rollback on subscription failure
          this.subscribed.delete(eventType);
          this.logger.error(`Failed to subscribe to ${channel}:`, error);
          this.metrics.errors++;
        });
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
          this.subscribed.delete(eventType);
          this.pubsub.unsubscribe(`mcp_${eventType}`).catch(() => {
            // Ignore unsubscribe errors
          });
        }
      }
    };
  }

  /**
   * Emit MCP event
   */
  async emit(
    eventType: MCPEventType,
    serverId: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const eventData: MCPEventData = {
      id: randomUUID(),
      type: eventType,
      serverId,
      processId: process.pid,
      timestamp: Date.now(),
      data,
    };

    try {
      this.logger.info(`Publishing to channel mcp_${eventType}`);
      await this.pubsub.publish(`mcp_${eventType}`, eventData);
      this.metrics.published++;
    } catch (error) {
      this.logger.error(`Failed to emit ${eventType} event:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Handle incoming events
   */
  private handleEvent(eventType: MCPEventType, data: MCPEventData): void {
    try {
      // Skip own events (same process ID)
      if (data.processId === process.pid) {
        return;
      }

      this.logger.info(`Received event ${eventType}`);

      // Validate event data
      if (!data.id || !data.serverId) {
        this.logger.warn("Invalid event data received:", data);
        return;
      }

      this.metrics.received++;

      // Call handlers
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          try {
            const result = handler(data);
            if (result instanceof Promise) {
              result.catch((error) => {
                this.logger.error(`Handler error for ${eventType}:`, error);
                this.metrics.errors++;
              });
            }
          } catch (error) {
            this.logger.error(`Handler error for ${eventType}:`, error);
            this.metrics.errors++;
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error handling ${eventType} event:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Add cleanup callback
   */
  onCleanup(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Close event manager
   */
  async close(): Promise<void> {
    try {
      // Run cleanup callbacks
      for (const callback of this.cleanupCallbacks) {
        try {
          callback();
        } catch (error) {
          this.logger.error("Cleanup callback error:", error);
        }
      }

      // Clear handlers
      this.handlers.clear();
      this.subscribed.clear();

      // Don't close the global PubSub instance here
      // It will be closed on process exit

      this.logger.debug("MCP Event Manager closed");
    } catch (error) {
      this.logger.error("Error closing MCP Event Manager:", error);
      throw error;
    }
  }
}

// Global instance management
let globalManager: MCPEventManager | null = null;
let isInitializing = false;

/**
 * Get global MCP event manager instance (thread-safe)
 */
export function getMCPEventManager(debug?: boolean): MCPEventManager {
  if (!globalManager && !isInitializing) {
    isInitializing = true;
    globalManager = new MCPEventManager({
      debug,
      enableMetrics: true,
    });
    isInitializing = false;
  }

  // Wait for initialization to complete
  while (isInitializing) {
    // Busy wait (should be very brief)
  }

  return globalManager!;
}

/**
 * Close global MCP event manager
 */
export async function closeMCPEventManager(): Promise<void> {
  if (globalManager) {
    try {
      await globalManager.close();
    } catch (error) {
      // Ignore errors during cleanup in tests
      console.warn("Error closing global MCP event manager:", error);
    } finally {
      globalManager = null;
    }
  }
}

/**
 * Emit add event (convenience function)
 */
export async function emitMCPAddEvent(serverId: string): Promise<void> {
  const manager = getMCPEventManager();
  await manager.emit("add", serverId);
}

/**
 * Emit remove event (convenience function)
 */
export async function emitMCPRemoveEvent(serverId: string): Promise<void> {
  const manager = getMCPEventManager();
  await manager.emit("remove", serverId);
}

/**
 * Emit refresh event (convenience function)
 */
export async function emitMCPRefreshEvent(serverId: string): Promise<void> {
  const manager = getMCPEventManager();
  await manager.emit("refresh", serverId);
}
