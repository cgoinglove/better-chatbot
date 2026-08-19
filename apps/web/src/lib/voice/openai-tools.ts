import type { ChatMention } from "app-types/chat";
import type { VercelAIMcpTool } from "app-types/mcp";
import { createMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { DEFAULT_VOICE_TOOLS } from "lib/ai/speech";
import {
  VoiceMcpToolReference,
  VoiceToolExecutionMap,
  VoiceToolStatus,
} from "./types";

export type OpenAIRealtimeFunctionTool = {
  name: string;
  type: "function";
  description?: string;
  parameters: Record<string, unknown>;
};

export type OpenAIRealtimeToolSetup = {
  tools: OpenAIRealtimeFunctionTool[];
  toolStatus: VoiceToolStatus;
  toolExecutionMap: VoiceToolExecutionMap;
};

function getStaticDescription(tool: VercelAIMcpTool): string | undefined {
  return typeof tool.description === "string" ? tool.description : undefined;
}

function normalizeObjectSchema(
  tool: VercelAIMcpTool,
  exposedName: string,
): Record<string, unknown> {
  const inputSchema = (tool.inputSchema as { jsonSchema?: unknown }).jsonSchema;
  const schema = inputSchema ?? {
    type: "object",
    properties: {},
    required: [],
  };

  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    throw new Error(`Invalid input schema for realtime tool "${exposedName}"`);
  }

  const normalized = { ...(schema as Record<string, unknown>) };
  if (normalized.type != null && normalized.type !== "object") {
    throw new Error(
      `Realtime tool "${exposedName}" must use an object input schema`,
    );
  }
  normalized.type = "object";
  normalized.properties =
    typeof normalized.properties === "object" &&
    normalized.properties !== null &&
    !Array.isArray(normalized.properties)
      ? normalized.properties
      : {};
  normalized.required = Array.isArray(normalized.required)
    ? normalized.required
    : [];

  try {
    JSON.stringify(normalized);
  } catch {
    throw new Error(
      `Input schema for realtime tool "${exposedName}" is not serializable`,
    );
  }

  return normalized;
}

export function vercelAIToolToOpenAITool(tool: VercelAIMcpTool, name: string) {
  return {
    name,
    type: "function" as const,
    description: getStaticDescription(tool),
    parameters: normalizeObjectSchema(tool, name),
  };
}

function mentionToReference(
  mention: Extract<ChatMention, { type: "mcpTool" | "mcpServer" }>,
): VoiceMcpToolReference {
  return {
    serverId: mention.serverId,
    serverName:
      mention.type === "mcpTool"
        ? (mention.serverName ?? mention.serverId)
        : mention.name,
    toolName: mention.type === "mcpTool" ? mention.name : "*",
    description: mention.description,
  };
}

function isReferenceAvailable(
  reference: VoiceMcpToolReference,
  available: VoiceMcpToolReference[],
): boolean {
  return available.some(
    (candidate) =>
      candidate.serverId === reference.serverId &&
      (reference.toolName === "*" || candidate.toolName === reference.toolName),
  );
}

export function buildOpenAIRealtimeToolSetup({
  mcpTools,
  requestedMentions = [],
  includeDefaultVoiceTools = true,
}: {
  mcpTools: Record<string, VercelAIMcpTool>;
  requestedMentions?: ChatMention[];
  includeDefaultVoiceTools?: boolean;
}): OpenAIRealtimeToolSetup {
  const toolExecutionMap: VoiceToolExecutionMap = {};
  const available: VoiceMcpToolReference[] = [];
  const usedNames = new Set<string>();

  if (includeDefaultVoiceTools) {
    for (const tool of DEFAULT_VOICE_TOOLS) {
      usedNames.add(tool.name);
    }
  }

  const openAiTools = Object.values(mcpTools).map((tool) => {
    const exposedName = createMCPToolId(
      tool._mcpServerName,
      tool._originToolName,
    );
    if (usedNames.has(exposedName)) {
      throw new Error(`Duplicate realtime tool name "${exposedName}"`);
    }
    usedNames.add(exposedName);

    toolExecutionMap[exposedName] = {
      mcpServerId: tool._mcpServerId,
      mcpServerName: tool._mcpServerName,
      toolName: tool._originToolName,
    };
    available.push({
      serverId: tool._mcpServerId,
      serverName: tool._mcpServerName,
      toolName: tool._originToolName,
      exposedName,
      description: getStaticDescription(tool),
    });

    return vercelAIToolToOpenAITool(tool, exposedName);
  });

  const requested = requestedMentions
    .filter(
      (
        mention,
      ): mention is Extract<ChatMention, { type: "mcpTool" | "mcpServer" }> =>
        mention.type === "mcpTool" || mention.type === "mcpServer",
    )
    .map(mentionToReference);
  const unavailable = requested.filter(
    (reference) => !isReferenceAvailable(reference, available),
  );

  return {
    tools: includeDefaultVoiceTools
      ? [
          ...openAiTools,
          ...DEFAULT_VOICE_TOOLS.map((tool) => ({
            ...tool,
            type: "function" as const,
          })),
        ]
      : openAiTools,
    toolStatus: { requested, available, unavailable },
    toolExecutionMap,
  };
}

export function buildOpenAIRealtimeTools({
  mcpTools,
  includeDefaultVoiceTools = true,
}: {
  mcpTools: Record<string, VercelAIMcpTool>;
  includeDefaultVoiceTools?: boolean;
}) {
  return buildOpenAIRealtimeToolSetup({
    mcpTools,
    includeDefaultVoiceTools,
  }).tools;
}

export function serializeRealtimeFunctionOutput(output: unknown): string {
  return JSON.stringify(output ?? null)
    .trim()
    .slice(0, 15000);
}

export const DEFAULT_BROWSER_VOICE_TOOL_NAMES = DEFAULT_VOICE_TOOLS.map(
  (tool) => tool.name,
);

export function isDefaultVoiceTool(toolName: string): boolean {
  return DEFAULT_BROWSER_VOICE_TOOL_NAMES.includes(toolName);
}
