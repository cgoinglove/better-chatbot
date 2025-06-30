import {
  LoadAPIKeyError,
  Message,
  Tool,
  ToolInvocation,
  jsonSchema,
  tool as createTool,
} from "ai";
import {
  ChatMention,
  ChatMessage,
  ChatMessageAnnotation,
  ToolInvocationUIPart,
} from "app-types/chat";
import { errorToString, objectFlow, toAny } from "lib/utils";
import { callMcpToolAction } from "../mcp/actions";
import logger from "logger";
import { defaultTools } from "lib/ai/tools";
import {
  AllowedMCPServer,
  McpServerCustomizationsPrompt,
  VercelAIMcpTool,
} from "app-types/mcp";
import { MANUAL_REJECT_RESPONSE_PROMPT } from "lib/ai/prompts";

import { ObjectJsonSchema7 } from "app-types/util";
import { safe } from "ts-safe";
import { workflowRepository } from "lib/db/repository";

import { VercelAIWorkflowTool } from "app-types/workflow";
import { createWorkflowExecutor } from "lib/ai/workflow/executor/workflow-executor";

export function filterMCPToolsByMentions(
  tools: Record<string, VercelAIMcpTool>,
  mentions: ChatMention[],
) {
  const toolMentions = mentions.filter(
    (mention) => mention.type == "tool" || mention.type == "mcpServer",
  );
  if (toolMentions.length === 0) {
    return tools;
  }

  const metionsByServer = toolMentions.reduce(
    (acc, mention) => {
      if (mention.type == "mcpServer") {
        return {
          ...acc,
          [mention.serverId]: Object.values(tools).map(
            (tool) => tool._originToolName,
          ),
        };
      }
      if (mention.type == "tool") {
        return {
          ...acc,
          [mention.serverId]: [...(acc[mention.serverId] ?? []), mention.name],
        };
      }
      return acc;
    },
    {} as Record<string, string[]>,
  ); // {serverId: [toolName1, toolName2]}

  return objectFlow(tools).filter((_tool) => {
    if (!metionsByServer[_tool._mcpServerId]) return false;
    return metionsByServer[_tool._mcpServerId].includes(_tool._originToolName);
  });
}

export function filterMCPToolsByAllowedMCPServers(
  tools: Record<string, VercelAIMcpTool>,
  allowedMcpServers?: Record<string, AllowedMCPServer>,
): Record<string, VercelAIMcpTool> {
  if (!allowedMcpServers) {
    return tools;
  }
  return objectFlow(tools).filter((_tool) => {
    if (!allowedMcpServers[_tool._mcpServerId]?.tools) return true;
    return allowedMcpServers[_tool._mcpServerId].tools.includes(
      _tool._originToolName,
    );
  });
}
export function getAllowedDefaultToolkit(
  allowedAppDefaultToolkit?: string[],
): Record<string, Tool> {
  if (!allowedAppDefaultToolkit) {
    return Object.values(defaultTools).reduce((acc, toolkit) => {
      return { ...acc, ...toolkit };
    }, {});
  }
  return allowedAppDefaultToolkit.reduce((acc, toolkit) => {
    return { ...acc, ...(defaultTools[toolkit] ?? {}) };
  }, {});
}

export function excludeToolExecution(
  tool: Record<string, Tool>,
): Record<string, Tool> {
  return objectFlow(tool).map((value) => {
    return createTool({
      parameters: value.parameters,
      description: value.description,
    });
  });
}

export function appendAnnotations(
  annotations: any[] = [],
  annotationsToAppend: ChatMessageAnnotation[] | ChatMessageAnnotation,
): ChatMessageAnnotation[] {
  const newAnnotations = Array.isArray(annotationsToAppend)
    ? annotationsToAppend
    : [annotationsToAppend];
  return [...annotations, ...newAnnotations];
}

export function mergeSystemPrompt(...prompts: (string | undefined)[]): string {
  const filteredPrompts = prompts
    .map((prompt) => prompt?.trim())
    .filter(Boolean);
  return filteredPrompts.join("\n\n");
}

export function manualToolExecuteByLastMessage(
  part: ToolInvocationUIPart,
  message: Message,
  tools: Record<string, VercelAIMcpTool>,
) {
  const { args, toolName } = part.toolInvocation;

  const manulConfirmation = (message.parts as ToolInvocationUIPart[]).find(
    (_part) => {
      return (
        _part.toolInvocation?.state == "result" &&
        _part.toolInvocation?.toolCallId == part.toolInvocation.toolCallId
      );
    },
  )?.toolInvocation as Extract<ToolInvocation, { state: "result" }>;

  if (!manulConfirmation?.result) return MANUAL_REJECT_RESPONSE_PROMPT;

  const tool = tools[toolName];

  return safe(() => {
    if (!tool) throw new Error(`tool not found: ${toolName}`);
  })
    .map(() => callMcpToolAction(tool._mcpServerId, tool._originToolName, args))
    .ifFail((error) => ({
      isError: true,
      statusMessage: `tool call fail: ${toolName}`,
      error: errorToString(error),
    }))
    .unwrap();
}

export function handleError(error: any) {
  if (LoadAPIKeyError.isInstance(error)) {
    return error.message;
  }

  logger.error(error);
  logger.error(error.name);
  return errorToString(error.message);
}

export function convertToMessage(message: ChatMessage): Message {
  return {
    ...message,
    id: message.id,
    content: "",
    role: message.role,
    parts: message.parts,
    experimental_attachments:
      toAny(message).attachments || toAny(message).experimental_attachments,
  };
}

export function extractInProgressToolPart(
  messages: Message[],
): ToolInvocationUIPart | null {
  let result: ToolInvocationUIPart | null = null;

  for (const message of messages) {
    for (const part of message.parts || []) {
      if (part.type != "tool-invocation") continue;
      if (part.toolInvocation.state == "result") continue;
      result = part as ToolInvocationUIPart;
      return result;
    }
  }
  return null;
}
export function assignToolResult(toolPart: ToolInvocationUIPart, result: any) {
  return Object.assign(toolPart, {
    toolInvocation: {
      ...toolPart.toolInvocation,
      state: "result",
      result,
    },
  });
}

export function filterMcpServerCustomizations(
  tools: Record<string, VercelAIMcpTool>,
  mcpServerCustomization: Record<string, McpServerCustomizationsPrompt>,
): Record<string, McpServerCustomizationsPrompt> {
  const toolNamesByServerId = Object.values(tools).reduce(
    (acc, tool) => {
      if (!acc[tool._mcpServerId]) acc[tool._mcpServerId] = [];
      acc[tool._mcpServerId].push(tool._originToolName);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  return Object.entries(mcpServerCustomization).reduce(
    (acc, [serverId, mcpServerCustomization]) => {
      if (!(serverId in toolNamesByServerId)) return acc;

      if (
        !mcpServerCustomization.prompt &&
        !Object.keys(mcpServerCustomization.tools ?? {}).length
      )
        return acc;

      const prompts: McpServerCustomizationsPrompt = {
        id: serverId,
        name: mcpServerCustomization.name,
        prompt: mcpServerCustomization.prompt,
        tools: mcpServerCustomization.tools
          ? objectFlow(mcpServerCustomization.tools).filter((_, key) => {
              return toolNamesByServerId[serverId].includes(key as string);
            })
          : {},
      };

      acc[serverId] = prompts;

      return acc;
    },
    {} as Record<string, McpServerCustomizationsPrompt>,
  );
}

export const workflowToVercelAITools = ({
  id,
  description,
  schema,
  name,
}: {
  id: string;
  name: string;
  description?: string;
  schema: ObjectJsonSchema7;
}): VercelAIWorkflowTool => {
  const tool = createTool({
    description: `${name} ${description?.trim().slice(0, 50)}`,
    parameters: jsonSchema(schema),
    execute(query, { toolCallId, abortSignal }) {
      console.log({ toolCallId });
      let lastNodeId;
      return safe(id)
        .map((id) =>
          workflowRepository.selectStructureById(id, {
            ignoreNote: true,
          }),
        )
        .map((workflow) => {
          if (!workflow) throw new Error("Not Found Workflow");
          const executor = createWorkflowExecutor({
            nodes: workflow.nodes,
            edges: workflow.edges,
          });
          abortSignal?.addEventListener("abort", () => executor.exit());
          executor.subscribe((e) => {
            if (e.eventType == "NODE_END") {
              lastNodeId = e.node.name;
            }
          });
          return executor.run(
            {
              query: query ?? ({} as any),
            },
            {
              disableHistory: true,
            },
          );
        })
        .map((result) => {
          if (result.isOk) {
            return result.output.getOutput({
              nodeId: lastNodeId,
              path: [],
            });
          }
          throw result.error;
        })
        .ifFail((err) => {
          return {
            error: {
              name: err?.name || "ERROR",
              message: errorToString(err),
            },
          };
        })
        .unwrap();
    },
  }) as VercelAIWorkflowTool;

  tool._workflowId = id;
  tool._originToolName = name;
  tool._toolName = name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toUpperCase();

  return tool;
};
