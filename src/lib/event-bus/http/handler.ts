import { NextRequest, NextResponse } from "next/server";
import type { BroadcastEvent } from "../types";
import type { HttpEventBus } from "./event-bus";
import logger from "logger";
import { colorize } from "consola/utils";

// Global event bus registry for handling incoming broadcasts
// TEMPORARY WORKAROUND: This is a hacky solution for Vercel's serverless
// environment. In production, use proper message queue infrastructure.
const eventBusRegistry = new Set<HttpEventBus>();

const handlerLogger = logger.withDefaults({
  message: colorize("yellow", "HTTP Broadcast Handler: "),
});

export function registerEventBus(eventBus: HttpEventBus) {
  eventBusRegistry.add(eventBus);
  handlerLogger.info(`Event bus registered (total: ${eventBusRegistry.size})`);
}

/**
 * Handle broadcast events from other instances
 *
 * TEMPORARY WORKAROUND FOR VERCEL:
 * This handles broadcast messages from other instances to keep
 * MCP clients synchronized across Vercel's serverless functions.
 *
 * Security: Protected by shared secret (INTERNAL_SYNC_SECRET)
 */
export async function handleBroadcast(request: NextRequest) {
  try {
    const secret = request.headers.get("X-Sync-Secret");
    const instanceId = request.headers.get("X-Instance-ID");

    handlerLogger.info(
      `Incoming broadcast from instance ${instanceId?.slice(0, 8) || "unknown"}`,
    );

    if (!secret) {
      handlerLogger.warn("Broadcast rejected: missing sync secret");
      return NextResponse.json(
        { error: "Missing sync secret" },
        { status: 401 },
      );
    }

    const event: BroadcastEvent = await request.json();
    handlerLogger.info(`Processing event: ${event.type}`);

    // Handle the event in all registered event buses
    const handlers = Array.from(eventBusRegistry);
    if (handlers.length === 0) {
      handlerLogger.warn("No event buses registered to handle broadcast");
    }

    await Promise.all(
      handlers.map((eventBus) =>
        eventBus.handleIncomingEvent(event, secret).catch((error) => {
          handlerLogger.error("Event bus handler failed:", error.message);
        }),
      ),
    );

    handlerLogger.info("Broadcast processed successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    handlerLogger.error("Broadcast handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
