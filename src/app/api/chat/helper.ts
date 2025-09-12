import {
  LoadAPIKeyError,
  Message,
  Tool,
  ToolInvocation,
  tool as createTool,
  streamText,
  generateText,
  CoreMessage,
  LanguageModel,
  smoothStream,
} from "ai";
import {
  ChatMention,
  ChatMessage,
  ChatMessageAnnotation,
  ToolInvocationUIPart,
} from "app-types/chat";
import { errorToString, objectFlow, toAny } from "lib/utils";
import { callMcpToolWithResourcesAction } from "../mcp/actions";
import { safe } from "ts-safe";
import logger from "logger";
import { defaultTools } from "lib/ai/tools";
import {
  AllowedMCPServer,
  McpServerCustomizationsPrompt,
  VercelAIMcpTool,
  MCPResourceContent,
} from "app-types/mcp";
import { MANUAL_REJECT_RESPONSE_PROMPT } from "lib/ai/prompts";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

export function filterToolsByMentions(
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

export function filterToolsByAllowedMCPServers(
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

/**
 * Extracts selected tools from tool calls in a message
 */
export function extractSelectedTools(
  messages: Message[],
): Array<{ serverId: string; toolName: string }> {
  const selectedTools: Array<{ serverId: string; toolName: string }> = [];

  for (const message of messages) {
    if (message.role === "assistant" && message.parts) {
      for (const part of message.parts) {
        if (part.type === "tool-invocation") {
          const toolName = part.toolInvocation.toolName;
          // Extract MCP server info from tool name if it follows the pattern
          const mcpToolMatch = toolName.match(/^(.+)__(.+)$/);
          if (mcpToolMatch) {
            const [, serverId, originToolName] = mcpToolMatch;
            selectedTools.push({ serverId, toolName: originToolName });
          }
        }
      }
    }
  }

  return selectedTools;
}

/**
 * Extracts selected tools from tool calls in the current step
 */
export function extractSelectedToolsFromStep(
  toolCalls: Array<{ toolName: string; args: any }>,
): Array<{ serverId: string; toolName: string }> {
  const selectedTools: Array<{ serverId: string; toolName: string }> = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.toolName;
    // Extract MCP server info from tool name if it follows the pattern
    const mcpToolMatch = toolName.match(/^(.+)__(.+)$/);
    if (mcpToolMatch) {
      const [, serverId, originToolName] = mcpToolMatch;
      selectedTools.push({ serverId, toolName: originToolName });
    }
  }

  return selectedTools;
}

/**
 * Creates tools with resource-aware descriptions for better argument generation
 * This approach adds resource context to tool descriptions upfront
 */
export async function createResourceAwareToolDescriptions(
  tools: Record<string, VercelAIMcpTool>,
): Promise<Record<string, VercelAIMcpTool>> {
  const enhancedTools: Record<string, VercelAIMcpTool> = {};

  for (const [toolName, tool] of Object.entries(tools)) {
    // Check if this tool references resources
    const resourceContent = await resolveResourcesForTool(
      tool._mcpServerId,
      tool._originToolName,
    );

    if (resourceContent) {
      // Create enhanced tool with resource context in description
      const enhancedTool = createTool({
        parameters: tool.parameters,
        description: `${tool.description}\n\n--- RESOURCE CONTEXT ---\n${resourceContent}`,
        execute: tool.execute!,
      });

      // Add MCP metadata to the enhanced tool
      enhancedTools[toolName] = Object.assign(enhancedTool, {
        _mcpServerName: tool._mcpServerName,
        _mcpServerId: tool._mcpServerId,
        _originToolName: tool._originToolName,
      }) as VercelAIMcpTool;
    } else {
      // No resources, use original tool
      enhancedTools[toolName] = tool;
    }
  }

  return enhancedTools;
}

/**
 * Multi-phase resource-aware chat orchestrator
 * Phase 1: Tool selection with basic tool descriptions
 * Phase 2: Resource fetching for selected tools
 * Phase 3: Enhanced tool call generation with resource context
 */
export async function createMultiPhaseResourceAwareFlow(
  model: LanguageModel,
  systemPrompt: string,
  messages: Message[],
  tools: Record<string, VercelAIMcpTool>,
  toolChoice: string,
  _dataStream: any,
  onFinishCallback?: (result: any) => Promise<void>,
) {
  // Phase 1: Initial tool selection with basic tools (no resources)
  logger.info("Phase 1: Tool selection with basic descriptions");

  const basicTools = excludeToolExecution(tools); // Tools without execute for selection only

  // Convert messages to CoreMessage format for generateText
  const coreMessages: CoreMessage[] = messages.map((msg) => ({
    role: msg.role as "system" | "user" | "assistant",
    content: msg.content || "",
  }));

  const selectionResult = await generateText({
    model,
    system: systemPrompt,
    messages: coreMessages,
    tools: basicTools,
    toolChoice: toolChoice === "manual" ? "required" : "auto",
  });

  // Extract selected tools from the result
  const selectedTools: Array<{
    toolName: string;
    serverId: string;
    originToolName: string;
  }> = [];

  for (const toolCall of selectionResult.toolCalls || []) {
    const tool = tools[toolCall.toolName];
    if (tool && "_mcpServerId" in tool) {
      selectedTools.push({
        toolName: toolCall.toolName,
        serverId: tool._mcpServerId,
        originToolName: tool._originToolName,
      });
    }
  }

  if (selectedTools.length === 0) {
    // No tools selected, return basic response
    logger.info("No tools selected, returning basic response");
    return streamText({
      model,
      system: systemPrompt,
      messages,
      experimental_transform: smoothStream({ chunking: "word" }),
      onFinish: onFinishCallback,
    });
  }

  // Phase 2: Fetch resources for selected tools only
  logger.info(
    `Phase 2: Fetching resources for ${selectedTools.length} selected tools`,
  );

  const resourcesByTool: Record<string, string> = {};
  for (const { serverId, originToolName, toolName } of selectedTools) {
    const resourceContent = await resolveResourcesForTool(
      serverId,
      originToolName,
    );
    if (resourceContent) {
      resourcesByTool[toolName] = resourceContent;
    }
  }

  // Phase 3: Enhanced tool call generation with resource context
  logger.info("Phase 3: Enhanced tool call generation with resource context");

  let enhancedTools = tools;
  if (Object.keys(resourcesByTool).length > 0) {
    enhancedTools = createResourceEnhancedTools(tools, resourcesByTool);

    // Add resource context to system prompt
    const resourceContextPrompt = `

--- RESOURCE CONTEXT FOR SELECTED TOOLS ---
You have selected tools that have additional resource context available. Use this context to generate more accurate and informed tool call parameters.

${Object.entries(resourcesByTool)
  .map(([toolName, content]) => `Tool: ${toolName}\n${content}`)
  .join("\n\n")}
---`;

    systemPrompt += resourceContextPrompt;
  }

  // Create messages including the selection result
  const updatedMessages: CoreMessage[] = [
    ...coreMessages,
    {
      role: "assistant" as const,
      content: selectionResult.text,
    },
  ];

  // Stream the final response with enhanced tools
  return streamText({
    model,
    system: systemPrompt,
    messages: updatedMessages,
    tools: enhancedTools,
    toolChoice: "auto",
    maxSteps: 10,
    experimental_continueSteps: true,
    experimental_transform: smoothStream({ chunking: "word" }),
    onFinish: onFinishCallback,
  });
}

/**
 * Creates resource-enhanced tools by adding resource context to tool descriptions
 */
export function createResourceEnhancedTools(
  tools: Record<string, VercelAIMcpTool>,
  resourcesByTool: Record<string, string>,
): Record<string, VercelAIMcpTool> {
  return objectFlow(tools).map((tool) => {
    const toolKey = `${tool._mcpServerId}__${tool._originToolName}`;
    const resourceContent = resourcesByTool[toolKey];

    if (!resourceContent) {
      return tool;
    }

    // Create enhanced tool with resource context in description
    const enhancedTool = createTool({
      parameters: tool.parameters,
      description: `${tool.description}\n\n--- RESOURCE CONTEXT ---\n${resourceContent}`,
      execute: tool.execute!,
    });

    // Add MCP metadata to the enhanced tool
    return Object.assign(enhancedTool, {
      _mcpServerName: tool._mcpServerName,
      _mcpServerId: tool._mcpServerId,
      _originToolName: tool._originToolName,
    }) as VercelAIMcpTool;
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
    .map(async () => {
      // Check if tool description contains resource context (indicating resources were pre-fetched)
      const hasResourceContext = tool.description?.includes(
        "--- RESOURCE CONTEXT ---",
      );

      if (hasResourceContext) {
        // Resources were already provided in tool description, use direct tool execution
        const { callMcpToolAction } = await import("../mcp/actions");
        return await callMcpToolAction(
          tool._mcpServerId,
          tool._originToolName,
          args,
        );
      } else {
        // Fallback to resource-aware tool calling for tools without pre-fetched resources
        const toolResult = await callMcpToolWithResourcesAction(
          tool._mcpServerId,
          tool._originToolName,
          args,
        );

        // If resources were found, prepend them to the tool result
        if (toolResult.resources) {
          const originalContent = toolResult.result.content || [];
          const resourceContent = {
            type: "text" as const,
            text: toolResult.resources,
          };

          return {
            ...toolResult.result,
            content: [resourceContent, ...originalContent],
          };
        }

        return toolResult.result;
      }
    })
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

export function isUserMessage(message: Message): boolean {
  return message.role == "user";
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

/**
 * Resolves resources referenced by a specific tool just before execution
 */
/**
 * Extracts resource URIs from a text description
 */
function extractResourceUris(description: string): string[] {
  const resourceUriRegex = /resources?:\/\/[^\s\)]+/g;
  return description.match(resourceUriRegex) || [];
}

/**
 * Checks if any of the selected tools reference resources
 */
export async function hasToolsWithResources(
  selectedTools: Array<{ serverId: string; toolName: string }>,
): Promise<boolean> {
  const clients = await mcpClientsManager.getClients();

  for (const { serverId, toolName } of selectedTools) {
    const targetClient = clients.find(({ id }) => id === serverId);
    if (!targetClient) continue;

    const info = targetClient.client.getInfo();
    const tool = info.toolInfo.find((t) => t.name === toolName);
    if (!tool) continue;

    // Check if tool description mentions any resource URIs
    const resourceUris = extractResourceUris(tool.description || "");
    if (resourceUris.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves resources for selected tools to provide context for tool call generation
 * Only fetches resources for tools that actually reference them
 */
export async function resolveResourcesForSelectedTools(
  selectedTools: Array<{ serverId: string; toolName: string }>,
): Promise<Record<string, string>> {
  const resourcesByTool: Record<string, string> = {};

  // Only proceed if any tools actually reference resources
  if (!(await hasToolsWithResources(selectedTools))) {
    return resourcesByTool;
  }

  for (const { serverId, toolName } of selectedTools) {
    const resourceContent = await resolveResourcesForTool(serverId, toolName);
    if (resourceContent) {
      resourcesByTool[`${serverId}:${toolName}`] = resourceContent;
    }
  }

  return resourcesByTool;
}

export async function resolveResourcesForTool(
  serverId: string,
  toolName: string,
): Promise<string | undefined> {
  try {
    const clients = await mcpClientsManager.getClients();
    const targetClient = clients.find(({ id }) => id === serverId);

    if (!targetClient) {
      logger.warn(`Client not found for server ID: ${serverId}`);
      return undefined;
    }

    const info = targetClient.client.getInfo();
    const tool = info.toolInfo.find((t) => t.name === toolName);

    if (!tool) {
      logger.warn(`Tool ${toolName} not found in server ${serverId}`);
      return undefined;
    }

    // Extract resource URIs from tool description
    const toolDescription = tool.description || "";
    const resourceUriRegex = /resources?:\/\/[^\s\)]+/g;
    const resourceUris = toolDescription.match(resourceUriRegex);

    if (!resourceUris || resourceUris.length === 0) {
      return undefined;
    }

    logger.info(`Found resource URIs in tool ${toolName}:`, resourceUris);

    const resourceContents: string[] = [];

    for (const uri of resourceUris) {
      try {
        // Try to read the resource from the same client first
        let resourceContent: MCPResourceContent[] | null = null;

        try {
          // Check if this client has this resource
          const hasDirectResource = info.resourceInfo.some(
            (r) => r.uri === uri,
          );
          const hasTemplateResource = info.resourceTemplateInfo.some((t) =>
            matchesTemplate(uri, t.uriTemplate),
          );

          if (hasDirectResource || hasTemplateResource) {
            try {
              resourceContent = await targetClient.client.readResource(uri);
            } catch (readError) {
              logger.warn(
                `Failed to read resource ${uri} from primary client even though it was found:`,
                readError,
              );
            }
          }
        } catch (error) {
          logger.warn(
            `Failed to check/read resource ${uri} from primary client:`,
            error,
          );
        }

        // If not found in primary client, try other clients
        if (!resourceContent) {
          logger.info(
            `Resource ${uri} not found in primary client, trying other clients...`,
          );
          for (const { client } of clients) {
            if (client === targetClient.client) continue; // Skip the one we already tried

            try {
              const clientInfo = client.getInfo();
              logger.info(
                `Checking client with resources:`,
                clientInfo.resourceInfo.map((r) => r.uri),
              );
              const hasDirectResource = clientInfo.resourceInfo.some(
                (r) => r.uri === uri,
              );
              const hasTemplateResource = clientInfo.resourceTemplateInfo.some(
                (t) => matchesTemplate(uri, t.uriTemplate),
              );

              logger.info(
                `Client has direct resource: ${hasDirectResource}, template resource: ${hasTemplateResource}`,
              );

              if (hasDirectResource || hasTemplateResource) {
                logger.info(`Attempting to read resource ${uri} from client`);
                try {
                  resourceContent = await client.readResource(uri);
                  logger.info(`Successfully read resource ${uri}`);
                  break;
                } catch (readError) {
                  logger.warn(
                    `Failed to read resource ${uri} from client even though it was found:`,
                    readError,
                  );
                  continue; // Try next client
                }
              }
            } catch (error) {
              logger.warn(`Failed to check client for resource ${uri}:`, error);
              continue; // Try next client
            }
          }
        }

        if (resourceContent && resourceContent.length > 0) {
          const content = resourceContent[0];
          if (content.text) {
            resourceContents.push(`### Resource: ${uri}\n${content.text}`);
          } else if (content.blob) {
            resourceContents.push(
              `### Resource: ${uri}\n[Binary content: ${content.mimeType || "unknown type"}]`,
            );
          }
        } else {
          logger.warn(`Could not resolve resource: ${uri}`);
          // Don't add missing resources to the output - just continue with available ones
          // This prevents cluttering the tool description with error messages
        }
      } catch (error) {
        logger.error(`Error resolving resource ${uri}:`, error);
        resourceContents.push(
          `### Resource: ${uri}\n[Error loading resource: ${errorToString(error)}]`,
        );
      }
    }

    if (resourceContents.length > 0) {
      return `
### Tool Resources ###
The following resources are referenced by the ${toolName} tool:

${resourceContents.join("\n\n")}
`.trim();
    }

    // Return undefined if no resources were successfully resolved
    // This allows the tool to work normally without resource context
    return undefined;
  } catch (error) {
    logger.error(`Error resolving resources for tool ${toolName}:`, error);
    return undefined;
  }
}

/**
 * Simple template matching for resource URIs
 * This is a basic implementation - could be enhanced with proper RFC 6570 support
 */
function matchesTemplate(uri: string, template: string): boolean {
  // Convert template to regex by replacing {param} with [^/]+
  const regexPattern = template.replace(/\{[^}]+\}/g, "[^/]+");
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(uri);
}

/**
 * Expands a resource template URI with parameters
 * Basic implementation for simple {param} substitution
 */
export function expandResourceTemplate(
  template: string,
  params: Record<string, string>,
): string {
  let expanded = template;
  for (const [key, value] of Object.entries(params)) {
    expanded = expanded.replace(
      new RegExp(`\\{${key}\\}`, "g"),
      encodeURIComponent(value),
    );
  }
  return expanded;
}

/**
 * Resolves resources mentioned in tool descriptions
 */
export async function resolveResourcesInTools(
  tools: Record<string, any>,
): Promise<string | undefined> {
  const resourceContents: string[] = [];
  const processedUris = new Set<string>();

  for (const [toolName, tool] of Object.entries(tools)) {
    // Check tool description for resource URIs
    const toolDescription = tool.description || "";
    const resourceUriRegex = /resources?:\/\/[^\s\)]+/g;
    const resourceUris = toolDescription.match(resourceUriRegex);

    if (resourceUris && resourceUris.length > 0) {
      logger.info(`Found resource URIs in tool ${toolName}:`, resourceUris);

      for (const uri of resourceUris) {
        if (processedUris.has(uri)) continue; // Avoid duplicates
        processedUris.add(uri);

        try {
          // Find which MCP client can handle this resource
          const clients = await mcpClientsManager.getClients();
          let resourceContent: MCPResourceContent[] | null = null;

          for (const { client } of clients) {
            try {
              // Check if this client has this resource
              const info = client.getInfo();
              const hasDirectResource = info.resourceInfo.some(
                (r) => r.uri === uri,
              );
              const hasTemplateResource = info.resourceTemplateInfo.some((t) =>
                matchesTemplate(uri, t.uriTemplate),
              );

              if (hasDirectResource || hasTemplateResource) {
                resourceContent = await client.readResource(uri);
                break;
              }
            } catch (error) {
              // Try next client
              logger.warn(`Failed to read resource ${uri} from client:`, error);
              continue;
            }
          }

          if (resourceContent && resourceContent.length > 0) {
            const content = resourceContent[0];
            if (content.text) {
              resourceContents.push(
                `### Tool Resource: ${uri} (referenced by ${toolName})\n${content.text}`,
              );
            } else if (content.blob) {
              resourceContents.push(
                `### Tool Resource: ${uri} (referenced by ${toolName})\n[Binary content: ${content.mimeType || "unknown type"}]`,
              );
            }
          } else {
            logger.warn(`Could not resolve tool resource: ${uri}`);
            resourceContents.push(
              `### Tool Resource: ${uri} (referenced by ${toolName})\n[Resource not found or not accessible]`,
            );
          }
        } catch (error) {
          logger.error(`Error resolving tool resource ${uri}:`, error);
          resourceContents.push(
            `### Tool Resource: ${uri} (referenced by ${toolName})\n[Error loading resource: ${errorToString(error)}]`,
          );
        }
      }
    }
  }

  if (resourceContents.length > 0) {
    return `
### Tool-Referenced Resources ###
The following resources are referenced by available tools and may be relevant to your task:

${resourceContents.join("\n\n")}
`.trim();
  }

  return undefined;
}

/**
 * Extracts parameter names from a resource template
 */
export function extractTemplateParams(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((match) => match.slice(1, -1)); // Remove { and }
}
