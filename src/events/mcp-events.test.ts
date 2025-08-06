import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  MCPEventManager,
  getMCPEventManager,
  closeMCPEventManager,
} from "./mcp-events";
import type { MCPEventData } from "./mcp-events";
import { randomUUID } from "crypto";

// Simple memory-based PubSub for testing
class MemoryPubSub {
  private handlers = new Map<string, Set<any>>();

  async subscribe(channel: string, handler: any): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);
  }

  async publish(channel: string, data: any): Promise<void> {
    const handlers = this.handlers.get(channel);
    if (handlers) {
      // Use setTimeout to simulate async behavior
      setTimeout(() => {
        for (const handler of handlers) {
          try {
            handler(data);
          } catch (error) {
            console.error("Handler error:", error);
          }
        }
      }, 1);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    this.handlers.delete(channel);
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }

  getStatus() {
    return "connected";
  }

  getSubscriptions() {
    return Array.from(this.handlers.keys());
  }

  isSubscribed(channel: string) {
    return this.handlers.has(channel);
  }
}

describe("MCP Events", () => {
  let manager: MCPEventManager;
  let memoryPubSub: MemoryPubSub;

  beforeEach(() => {
    vi.clearAllMocks();
    memoryPubSub = new MemoryPubSub();
    manager = new MCPEventManager({
      debug: false,
      enableMetrics: true,
      pubsub: memoryPubSub as any,
    });
  });

  afterEach(async () => {
    await manager.close();
  });

  it("should handle event subscription and emission", async () => {
    const receivedEvents: MCPEventData[] = [];

    // Subscribe to events
    const unsubscribe = manager.on("add", (data) => {
      receivedEvents.push(data);
    });

    // Temporarily disable process ID filtering for testing
    const originalHandleEvent = (manager as any).handleEvent;
    (manager as any).handleEvent = function (
      eventType: string,
      data: MCPEventData,
    ) {
      // Skip process ID check for testing
      this.metrics.received++;
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(data);
          } catch (error) {
            console.error("Handler error:", error);
          }
        }
      }
    };

    await manager.emit("add", randomUUID());

    // Small delay for event processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should receive event
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].type).toBe("add");
    expect(receivedEvents[0].serverId).toBeDefined();

    // Restore original method
    (manager as any).handleEvent = originalHandleEvent;

    // Cleanup
    unsubscribe();
  });

  it("should not receive own events (same process ID)", async () => {
    const receivedEvents: MCPEventData[] = [];

    manager.on("add", (data) => {
      receivedEvents.push(data);
    });

    // Same process ID - should be filtered out
    await manager.emit("add", randomUUID());
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedEvents).toHaveLength(0);
  });

  it("should handle multiple event types", async () => {
    const addEvents: MCPEventData[] = [];
    const removeEvents: MCPEventData[] = [];

    manager.on("add", (data) => {
      addEvents.push(data);
    });
    manager.on("remove", (data) => {
      removeEvents.push(data);
    });

    // Disable process ID filtering for testing
    const originalHandleEvent = (manager as any).handleEvent;
    (manager as any).handleEvent = function (
      eventType: string,
      data: MCPEventData,
    ) {
      this.metrics.received++;
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(data);
          } catch (error) {
            console.error("Handler error:", error);
          }
        }
      }
    };

    await manager.emit("add", randomUUID());
    await manager.emit("remove", randomUUID());

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(addEvents).toHaveLength(1);
    expect(removeEvents).toHaveLength(1);
    expect(addEvents[0].serverId).toBeDefined();
    expect(removeEvents[0].serverId).toBeDefined();

    // Restore original method
    (manager as any).handleEvent = originalHandleEvent;
  });

  it("should provide metrics", async () => {
    const metrics1 = manager.getMetrics();
    expect(metrics1.published).toBe(0);
    expect(metrics1.received).toBe(0);
    expect(metrics1.errors).toBe(0);

    await manager.emit("add", randomUUID());

    const metrics2 = manager.getMetrics();
    expect(metrics2.published).toBe(1);
  });

  it("should unsubscribe handlers", async () => {
    const receivedEvents: MCPEventData[] = [];

    const unsubscribe = manager.on("add", (data) => {
      receivedEvents.push(data);
    });

    // Disable process ID filtering for testing
    const originalHandleEvent = (manager as any).handleEvent;
    (manager as any).handleEvent = function (
      eventType: string,
      data: MCPEventData,
    ) {
      this.metrics.received++;
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(data);
          } catch (error) {
            console.error("Handler error:", error);
          }
        }
      }
    };

    await manager.emit("add", randomUUID());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(receivedEvents).toHaveLength(1);

    // Unsubscribe
    unsubscribe();

    await manager.emit("add", randomUUID());
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should still have only 1 event
    expect(receivedEvents).toHaveLength(1);

    // Restore original method
    (manager as any).handleEvent = originalHandleEvent;
  });

  it("should handle cleanup callbacks", async () => {
    const cleanupSpy = vi.fn();
    manager.onCleanup(cleanupSpy);

    await manager.close();

    expect(cleanupSpy).toHaveBeenCalled();
  });

  it("should handle refresh events with data", async () => {
    const refreshEvents: MCPEventData[] = [];

    manager.on("refresh", (data) => {
      refreshEvents.push(data);
    });

    // Disable process ID filtering for testing
    const originalHandleEvent = (manager as any).handleEvent;
    (manager as any).handleEvent = function (
      eventType: string,
      data: MCPEventData,
    ) {
      this.metrics.received++;
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(data);
          } catch (error) {
            console.error("Handler error:", error);
          }
        }
      }
    };

    await manager.emit("refresh", randomUUID(), {
      reason: "oauth_success",
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(refreshEvents).toHaveLength(1);
    expect(refreshEvents[0].data?.reason).toBe("oauth_success");

    // Restore original method
    (manager as any).handleEvent = originalHandleEvent;
  });
});

describe("Global MCP Event Manager", () => {
  afterEach(async () => {
    await closeMCPEventManager();
  });

  it("should create and reuse global instance", () => {
    const manager1 = getMCPEventManager();
    const manager2 = getMCPEventManager();

    expect(manager1).toBe(manager2);
  });

  it("should close global instance", async () => {
    const manager = getMCPEventManager();
    expect(manager).toBeDefined();

    await closeMCPEventManager();

    // Should create new instance after closing
    const newManager = getMCPEventManager();
    expect(newManager).not.toBe(manager);
  });
});
