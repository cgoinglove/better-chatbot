import {
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
  type UIMessage,
  formatDataStreamPart,
  appendClientMessage,
  Message,
  Tool,
  type DataStreamWriter,
} from "ai";

import { myProvider } from "@/lib/ai/models";

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

import { chatRepository } from "lib/db/repository";
import logger from "logger";
import {
  buildProjectInstructionsSystemPrompt,
  buildUserSystemPrompt,
} from "lib/ai/prompts";
import {
  chatApiSchemaRequestBodySchema,
  ChatMessageAnnotation,
} from "app-types/chat";

import { AppDefaultToolkit } from "app-types/chat";
import { defaultTools } from "lib/ai/tools";
import type { ChatRequestBody } from "./types";

import {
  appendAnnotations,
  excludeToolExecution,
  filterToolsByMentions,
  handleError,
  manualToolExecuteByLastMessage,
  mergeSystemPrompt,
  convertToMessage,
  extractInProgressToolPart,
  assignToolResult,
  isUserMessage,
  filterToolsByAllowedMCPServers,
} from "./helper";
import { generateTitleFromUserMessageAction } from "./actions";
import { getSession } from "auth/server";
import { createDocument } from "lib/ai/tools/create-document";
import { updateDocument } from "lib/ai/tools/update-document";

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as ChatRequestBody;
    
    // Debug logging to understand AI SDK v5 request structure
    console.log('[DEBUG] Chat API - Full request body:', JSON.stringify(json, null, 2));

    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      id,
      message,
      messages: requestMessages,
      model: modelName,
      toolChoice,
      allowedAppDefaultToolkit,
      allowedMcpServers,
      projectId,
    } = chatApiSchemaRequestBodySchema.parse(json);
    
    console.log('[DEBUG] Chat API - Parsed message:', JSON.stringify(message, null, 2));
    console.log('[DEBUG] Chat API - Parsed messages:', JSON.stringify(requestMessages, null, 2));
    
    // Handle both AI SDK v4 (single message) and v5 (messages array) formats
    const currentMessage = message || (requestMessages && requestMessages[requestMessages.length - 1]);
    console.log('[DEBUG] Chat API - Current message for title:', JSON.stringify(currentMessage, null, 2));

    const model = myProvider.getModel(modelName);

    let thread = await chatRepository.selectThreadDetails(id);

    if (!thread) {
      const title = await generateTitleFromUserMessageAction({
        message: currentMessage,
        model,
      });
      const newThread = await chatRepository.insertThread({
        id,
        projectId: projectId ?? null,
        title,
        userId: session.user.id,
        visibility: "private",
      });
      thread = await chatRepository.selectThreadDetails(newThread.id);
    }

    // if is false, it means the last message is manual tool execution
    const isLastMessageUserMessage = isUserMessage(currentMessage);

    const previousMessages = (thread?.messages ?? []).map(convertToMessage);

    if (!thread) {
      return new Response("Thread not found", { status: 404 });
    }

    const annotations = (currentMessage?.annotations as ChatMessageAnnotation[]) ?? [];

    const mcpTools = mcpClientsManager.tools();

    const isToolCallAllowed = toolChoice != "none";

    const requiredToolsAnnotations = annotations
      .flatMap((annotation) => annotation.requiredTools)
      .filter(Boolean) as string[];

    // Define artifact tools that should be included when allowed
    const artifactTools: Record<string, Tool> = {};
    let dataStreamRef: DataStreamWriter | null = null;

    // Only add artifact tools when tool calls are allowed
    if (isToolCallAllowed && toolChoice !== ("none" as any)) {
      // Create a session object structure that matches what the tools expect
      const sessionForTools = session as any;

      // Create the tools with a proxy for the data stream
      const createToolWithDataStream = (toolFn: any) => {
        return toolFn({
          session: sessionForTools,
          dataStream: {
            writeData: (data: any) => {
              if (dataStreamRef) {
                return dataStreamRef.writeData(data);
              }
              console.warn("Data stream not yet available");
            },
          },
        });
      };

      artifactTools.createDocument = createToolWithDataStream(createDocument);
      artifactTools.updateDocument = createToolWithDataStream(updateDocument);
    }

    // Get enabled default toolkit tools based on allowedAppDefaultToolkit
    const enabledDefaultTools: Record<string, Tool> = {};
    
    if (allowedAppDefaultToolkit?.includes(AppDefaultToolkit.Weather)) {
      Object.assign(enabledDefaultTools, defaultTools[AppDefaultToolkit.Weather] ?? {});
    }
    
    if (allowedAppDefaultToolkit?.includes(AppDefaultToolkit.WebSearch)) {
      Object.assign(enabledDefaultTools, defaultTools[AppDefaultToolkit.WebSearch] ?? {});
    }
    
    if (allowedAppDefaultToolkit?.includes(AppDefaultToolkit.Visualization)) {
      Object.assign(enabledDefaultTools, defaultTools[AppDefaultToolkit.Visualization] ?? {});
    }

    // Get all available tools
    const availableTools: Record<string, Tool> = {
      ...enabledDefaultTools,
      ...artifactTools,
      ...(isToolCallAllowed ? mcpTools : {}),
    };

    // Filter tools based on mentions if needed
    const filteredTools =
      requiredToolsAnnotations.length > 0
        ? filterToolsByMentions(availableTools, requiredToolsAnnotations)
        : availableTools;

    // Filter by MCP servers if needed
    const mcpFilteredTools = allowedMcpServers
      ? filterToolsByAllowedMCPServers(filteredTools, allowedMcpServers)
      : filteredTools;

    // Apply manual mode filtering if needed
    const tools =
      toolChoice === "manual"
        ? excludeToolExecution(mcpFilteredTools)
        : mcpFilteredTools;

    if (!tools) {
      console.log("[DEBUG] No tools available");
    }

    const messages: Message[] = isLastMessageUserMessage
      ? appendClientMessage({
          messages: previousMessages,
          message: currentMessage,
        })
      : previousMessages;

    // Create the response
    return createDataStreamResponse({
      execute: async (dataStream) => {
        // Update the data stream reference for the tools
        dataStreamRef = dataStream;
        const inProgressToolStep = extractInProgressToolPart(
          messages.slice(-2),
        );

        if (inProgressToolStep) {
          const toolResult = await manualToolExecuteByLastMessage(
            inProgressToolStep,
            currentMessage,
          );
          assignToolResult(inProgressToolStep, toolResult);
          dataStream.write(
            formatDataStreamPart("tool_result", {
              toolCallId: inProgressToolStep.toolInvocation.toolCallId,
              result: toolResult,
            }),
          );
        }

        const userPreferences = thread?.userPreferences || undefined;

        const systemPrompt = mergeSystemPrompt(
          buildUserSystemPrompt(session.user, userPreferences),
          buildProjectInstructionsSystemPrompt(thread?.instructions),
        );

        // Precompute toolChoice to avoid repeated tool calls
        const computedToolChoice =
          isToolCallAllowed &&
          requiredToolsAnnotations.length > 0 &&
          inProgressToolStep
            ? "required"
            : "auto";

        const result = streamText({
          model,
          system: systemPrompt,
          messages,
          maxSteps: 10,
          experimental_continueSteps: true,
          experimental_transform: smoothStream({ chunking: "word" }),
          maxRetries: 0,
          tools,
          toolChoice: computedToolChoice,
          // Don't restrict active tools - allow all tools to be used
          // This ensures MCP tools like tavily and sonos are available
          experimental_activeTools: toolChoice === "none" ? [] : undefined,
          onFinish: async ({ response, usage }) => {
            const appendMessages = appendResponseMessages({
              messages: messages.slice(-1),
              responseMessages: response.messages,
            });
            if (isLastMessageUserMessage) {
              await chatRepository.insertMessage({
                threadId: thread!.id,
                model: modelName,
                role: "user",
                parts: currentMessage.parts,
                attachments: currentMessage.experimental_attachments,
                id: currentMessage.id,
                annotations: appendAnnotations(currentMessage.annotations, {
                  usageTokens: usage.promptTokens,
                }),
              });
            }
            const assistantMessage = appendMessages.at(-1);
            if (assistantMessage) {
              const annotations = appendAnnotations(
                assistantMessage.annotations,
                {
                  usageTokens: usage.completionTokens,
                  toolChoice,
                },
              );
              dataStream.writeMessageAnnotation(annotations.at(-1)!);
              await chatRepository.upsertMessage({
                model: modelName,
                threadId: thread!.id,
                role: assistantMessage.role,
                id: assistantMessage.id,
                parts: assistantMessage.parts as UIMessage["parts"],
                attachments: assistantMessage.experimental_attachments,
                annotations,
              });
            }
          },
        });
        result.consumeStream();
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: handleError,
    });
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message, { status: 500 });
  }
}
