import { createEphemeralMCPClient } from "lib/ai/mcp/ephemeral-client";
import { extractMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { mcpRepository } from "lib/db/repository";
import { isDefaultVoiceTool } from "./openai-tools";
import {
  VoiceActor,
  VoiceToolExecutionInput,
  VoiceToolExecutionResult,
} from "./types";

function errorResult(
  toolName: string,
  message: string,
  code?: string,
  callId?: string,
): VoiceToolExecutionResult {
  return {
    ok: false,
    toolName,
    callId,
    output: null,
    error: { message, code },
  };
}

async function executeServerSupportedDefaultVoiceTool(
  toolName: string,
  args: unknown,
  actor: VoiceActor,
  callId?: string,
): Promise<VoiceToolExecutionResult> {
  switch (toolName) {
    case "changeBrowserTheme":
      if (actor.source === "m5stack") {
        return {
          ok: true,
          toolName,
          callId,
          output: { skipped: true, reason: "browser_only" },
        };
      }
      return {
        ok: true,
        toolName,
        callId,
        output: { theme: (args as { theme?: string })?.theme ?? null },
      };
    case "endConversation":
      return {
        ok: true,
        toolName,
        callId,
        output: { ended: true },
      };
    default:
      return errorResult(
        toolName,
        "Unknown default voice tool",
        "unknown_tool",
        callId,
      );
  }
}

function normalizeToolError(
  toolName: string,
  error: unknown,
  callId?: string,
): VoiceToolExecutionResult {
  const message =
    error instanceof Error ? error.message : "Tool execution failed";
  return errorResult(toolName, message, "tool_execution_failed", callId);
}

export async function executeVoiceTool(
  input: VoiceToolExecutionInput,
): Promise<VoiceToolExecutionResult> {
  if (Boolean(input.mcpServerId) !== Boolean(input.mcpToolName)) {
    return errorResult(
      input.toolName,
      "MCP server and tool must be provided together",
      "invalid_arguments",
      input.callId,
    );
  }

  const args =
    input.arguments ??
    (input.argumentsText ? JSON.parse(input.argumentsText) : {});

  if (isDefaultVoiceTool(input.toolName)) {
    return executeServerSupportedDefaultVoiceTool(
      input.toolName,
      args,
      input.actor,
      input.callId,
    );
  }

  const legacyTarget =
    input.mcpServerId && input.mcpToolName
      ? null
      : extractMCPToolId(input.toolName);
  const mcpServerId = input.mcpServerId;
  const toolName = input.mcpToolName ?? legacyTarget?.toolName;
  const server = mcpServerId
    ? await mcpRepository.selectById(mcpServerId)
    : await mcpRepository.selectByServerName(legacyTarget?.serverName ?? "");
  if (!server) {
    return errorResult(
      input.toolName,
      "MCP server not found",
      "not_found",
      input.callId,
    );
  }

  if (!server.enabled || !toolName) {
    return errorResult(
      input.toolName,
      "MCP server or tool is not available",
      "unavailable",
      input.callId,
    );
  }

  const hasAccess = await mcpRepository.checkAccess(
    server.id,
    input.actor.userId,
    false,
    input.actor.organizationId,
  );
  if (!hasAccess) {
    return errorResult(input.toolName, "Forbidden", "forbidden", input.callId);
  }

  const client = await createEphemeralMCPClient(server.id, input.actor.userId);
  if (!client) {
    return errorResult(
      input.toolName,
      "MCP server not available",
      "unavailable",
      input.callId,
    );
  }

  try {
    const output = await client.callTool(toolName, args);
    return {
      ok: true,
      toolName: input.toolName,
      callId: input.callId,
      output,
    };
  } catch (error) {
    return normalizeToolError(input.toolName, error, input.callId);
  } finally {
    await client.disconnect();
  }
}
