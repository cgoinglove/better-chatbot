import {
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
  type UIMessage,
  formatDataStreamPart,
  appendClientMessage,
  Message,
} from "ai";

import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

import { chatRepository } from "lib/db/repository";
import logger from "logger";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildProjectInstructionsSystemPrompt,
  buildUserSystemPrompt,
} from "lib/ai/prompts";
import {
  chatApiSchemaRequestBodySchema,
  ChatMention,
  ChatMessageAnnotation,
} from "app-types/chat";

import { errorIf, safe } from "ts-safe";
import { generateUUID } from "lib/utils";

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
  getAllowedDefaultToolkit,
  filterToolsByAllowedMCPServers,
  filterMcpServerCustomizations,
  createResourceAwareToolDescriptions,
  createMultiPhaseResourceAwareFlow,
} from "./helper";
import {
  generateTitleFromUserMessageAction,
  rememberMcpServerCustomizationsAction,
} from "./actions";
import { getSession } from "auth/server";

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      id,
      message,
      chatModel,
      toolChoice,
      allowedAppDefaultToolkit,
      allowedMcpServers,
      projectId,
    } = chatApiSchemaRequestBodySchema.parse(json);

    const model = customModelProvider.getModel(chatModel);

    let thread = await chatRepository.selectThreadDetails(id);

    if (!thread) {
      const title = await generateTitleFromUserMessageAction({
        message,
        model,
      });
      const newThread = await chatRepository.insertThread({
        id,
        projectId: projectId ?? null,
        title,
        userId: session.user.id,
      });
      thread = await chatRepository.selectThreadDetails(newThread.id);
    }

    if (thread!.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    // if is false, it means the last message is manual tool execution
    const isLastMessageUserMessage = isUserMessage(message);

    const previousMessages = (thread?.messages ?? []).map(convertToMessage);

    if (!thread) {
      return new Response("Thread not found", { status: 404 });
    }

    const annotations = (message?.annotations as ChatMessageAnnotation[]) ?? [];

    const mcpTools = mcpClientsManager.tools();

    const mentions = annotations
      .flatMap((annotation) => annotation.mentions)
      .filter(Boolean) as ChatMention[];

    const isToolCallAllowed =
      (!isToolCallUnsupportedModel(model) && toolChoice != "none") ||
      mentions.length > 0;

    const tools = safe(mcpTools)
      .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
      .map((tools) => {
        // filter tools by mentions
        if (mentions.length) {
          return filterToolsByMentions(tools, mentions);
        }
        // filter tools by allowed mcp servers
        return filterToolsByAllowedMCPServers(tools, allowedMcpServers);
      })
      .orElse(undefined);

    const messages: Message[] = isLastMessageUserMessage
      ? appendClientMessage({
          messages: previousMessages,
          message,
        })
      : previousMessages;

    return createDataStreamResponse({
      execute: async (dataStream) => {
        const inProgressToolStep = extractInProgressToolPart(
          messages.slice(-2),
        );

        if (inProgressToolStep) {
          const toolResult = await manualToolExecuteByLastMessage(
            inProgressToolStep,
            message,
            mcpTools,
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

        const mcpServerCustomizations = await safe()
          .map(() => {
            if (Object.keys(tools ?? {}).length === 0)
              throw new Error("No tools found");
            return rememberMcpServerCustomizationsAction(session.user.id);
          })
          .map((v) => filterMcpServerCustomizations(tools!, v))
          .orElse({});

        const systemPrompt = mergeSystemPrompt(
          buildUserSystemPrompt(session.user, userPreferences),
          buildProjectInstructionsSystemPrompt(thread?.instructions),
          buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
        );

        // Precompute toolChoice to avoid repeated tool calls
        const computedToolChoice =
          isToolCallAllowed && mentions.length > 0 && inProgressToolStep
            ? "required"
            : "auto";

        const vercelAITooles = safe(tools)
          .map((t) => {
            if (!t) return undefined;

            return {
              ...getAllowedDefaultToolkit(allowedAppDefaultToolkit),
              ...t,
            };
          })
          .unwrap();

        // Use multi-phase resource-aware flow for better resource handling
        const result = await createMultiPhaseResourceAwareFlow(
          model,
          systemPrompt,
          messages,
          vercelAITooles || {},
          computedToolChoice,
          dataStream,
                    async (finishResult) => {
            // CRITICAL: Handle database operations for message persistence
            logger.info("Multi-phase flow completed, handling database operations");
            
            try {
              // Save the user message if it's a new message
              if (isLastMessageUserMessage && message) {
                const userMessage = {
                  id: message.id,
                  threadId: id,
                  role: message.role,
                  content: message.content,
                  parts: message.parts,
                  annotations: message.annotations,
                  attachments: message.attachments,
                };
                await chatRepository.upsertMessage(userMessage);
                logger.info(`Saved user message ${message.id} to database`);
              }

              // Save the assistant response
              if (finishResult) {
                const assistantMessageParts = [];
                
                if (finishResult.text) {
                  assistantMessageParts.push({
                    type: "text" as const,
                    text: finishResult.text,
                  });
                }

                if (finishResult.toolCalls?.length > 0) {
                  for (const toolCall of finishResult.toolCalls) {
                    assistantMessageParts.push({
                      type: "tool-call" as const,
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                      args: toolCall.args,
                    });
                  }
                }

                if (finishResult.toolResults?.length > 0) {
                  for (const toolResult of finishResult.toolResults) {
                    assistantMessageParts.push({
                      type: "tool-result" as const,
                      toolCallId: toolResult.toolCallId,
                      toolName: toolResult.toolName,
                      result: toolResult.result,
                    });
                  }
                }

                const assistantMessage = {
                  id: generateUUID(),
                  threadId: id,
                  role: "assistant" as const,
                  content: finishResult.text || "",
                  parts: assistantMessageParts,
                  annotations: annotations,
                  model: chatModel,
                };
                
                await chatRepository.upsertMessage(assistantMessage);
                logger.info(`Saved assistant message ${assistantMessage.id} to database`);
              }

              logger.info("Messages successfully saved to database");
            } catch (error) {
              logger.error("Failed to save messages to database:", error);
            }
          },
        );

        // Handle the streaming result
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
