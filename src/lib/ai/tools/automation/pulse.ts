import { tool as createTool } from "ai";
import { JSONSchema7 } from "json-schema";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { createPulseWorkflow } from "lib/ai/workflow/pulse-workflow";
import { getRequestContext } from "lib/request-context";

const pulseToolSchema: JSONSchema7 = {
  type: "object",
  additionalProperties: false,
  properties: {
    topic: {
      type: "string",
      description:
        "Subject to monitor (e.g. `latest AI policy news`, `bitcoin regulation updates`).",
    },
    cron: {
      type: "string",
      description:
        "Cron expression describing when the automation should run. Use standard 5-field cron such as `0 7 * * *`.",
    },
    timezone: {
      type: "string",
      description:
        "IANA timezone for the schedule such as `America/New_York`. Defaults to the user's current timezone or UTC.",
    },
    workflowName: {
      type: "string",
      description:
        "Optional friendly workflow name (defaults to `Pulse – <topic>`).",
    },
    description: {
      type: "string",
      description: "Optional workflow description shown in the Workflow list.",
    },
    scheduleDescription: {
      type: "string",
      description: "Human readable description of what the schedule monitors.",
    },
    summaryInstructions: {
      type: "string",
      description:
        "Custom instructions for how the summary should be written when the automation runs.",
    },
    numResults: {
      type: "number",
      description:
        "How many web results to fetch on each run (1-10, default 6).",
      minimum: 1,
      maximum: 10,
      default: 6,
    },
  },
  required: ["topic", "cron"],
};

function isValidTimezone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveTimezone(candidate?: string, fallback?: string): string {
  if (isValidTimezone(candidate)) return candidate!;
  if (isValidTimezone(fallback)) return fallback!;
  return "UTC";
}

export const pulseTool = createTool({
  description:
    "Create a Pulse automation that monitors a topic on a recurring schedule. Provide a cron expression, timezone, and topic so the assistant can build a workflow that performs a web search, summarizes the findings, and replies in the thread when each run completes.",
  inputSchema: jsonSchemaToZod(pulseToolSchema),
  async execute(input) {
    const context = getRequestContext();
    if (!context?.userId) {
      throw new Error("Missing user context for Pulse automation.");
    }

    const topic = input.topic.trim();
    const cron = input.cron.trim();
    if (!topic) {
      throw new Error("Topic cannot be empty.");
    }
    if (!cron) {
      throw new Error("Cron expression cannot be empty.");
    }

    const timezone = resolveTimezone(input.timezone, context.clientTimezone);
    const numResults = clampNumber(Math.round(input.numResults ?? 6), 1, 10);
    const workflowName = (input.workflowName || `Pulse – ${topic}`).trim();

    const result = await createPulseWorkflow({
      userId: context.userId,
      workflowName,
      description: input.description,
      query: topic,
      cron,
      timezone,
      scheduleDescription:
        input.scheduleDescription || `Monitor ${topic} (${cron} ${timezone})`,
      summaryInstructions: input.summaryInstructions,
      numResults,
      model: context.chatModel,
    });

    return {
      workflowId: result.workflowId,
      scheduleNodeId: result.scheduleNodeId,
      topic,
      cron,
      timezone,
      nextRunAt: result.nextRunAt?.toISOString() ?? null,
      numResults,
      summaryInstructions: input.summaryInstructions,
      message: `Created Pulse workflow "${workflowName}" for "${topic}". Next run: ${result.nextRunAt?.toISOString() ?? "unknown"}.`,
    };
  },
});
