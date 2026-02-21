import { tool as createTool } from "ai";

import { z } from "zod";

export const createTimelineTool = createTool({
  description:
    "Create a timeline visualization showing chronological events with status indicators. Use for project milestones, event chronologies, process steps, audit trails, or any time-based sequential data with status tracking (pending/in-progress/complete).",
  inputSchema: z.object({
    title: z.string().describe("Title for the timeline"),
    description: z
      .string()
      .optional()
      .describe("Optional description or context for the timeline"),
    events: z
      .array(
        z.object({
          title: z.string().describe("Event title"),
          description: z
            .string()
            .optional()
            .describe("Optional detailed description of the event"),
          timestamp: z
            .string()
            .describe(
              "ISO 8601 timestamp or relative time string (e.g., '2024-01-15T10:00:00Z' or 'Yesterday')",
            ),
          status: z
            .enum(["pending", "in-progress", "complete"])
            .describe(
              "Event status: pending (gray outline), in-progress (blue), complete (green)",
            ),
          icon: z
            .string()
            .optional()
            .describe(
              "Optional Lucide icon name (e.g., 'CheckCircle', 'Clock', 'Zap')",
            ),
        }),
      )
      .describe("Array of timeline events in chronological order"),
  }),
  execute: async () => {
    return "Success";
  },
});
