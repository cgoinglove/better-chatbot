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

import { chatRepository, workflowRepository } from "lib/db/repository";
import globalLogger from "logger";
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

import {
  appendAnnotations,
  excludeToolExecution,
  filterMCPToolsByMentions,
  handleError,
  manualToolExecuteByLastMessage,
  mergeSystemPrompt,
  convertToMessage,
  extractInProgressToolPart,
  assignToolResult,
  workflowToVercelAITools,
  getAllowedDefaultToolkit,
  filterMCPToolsByAllowedMCPServers,
  filterMcpServerCustomizations,
} from "./shared.chat";
import {
  generateTitleFromUserMessageAction,
  rememberMcpServerCustomizationsAction,
} from "./actions";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import {
  isVercelAIWorkflowTool,
  VercelAIWorkflowTool,
} from "app-types/workflow";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Chat API: `),
});

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
    const isLastMessageUserMessage = message.role == "user";

    const previousMessages = (thread?.messages ?? []).map(convertToMessage);

    if (!thread) {
      return new Response("Thread not found", { status: 404 });
    }

    const annotations = (message?.annotations as ChatMessageAnnotation[]) ?? [];

    const mentions = annotations
      .flatMap((annotation) => annotation.mentions)
      .filter(Boolean) as ChatMention[];

    const isToolCallAllowed =
      (!isToolCallUnsupportedModel(model) && toolChoice != "none") ||
      mentions.length > 0;

    const messages: Message[] = isLastMessageUserMessage
      ? appendClientMessage({
          messages: previousMessages,
          message,
        })
      : previousMessages;

    return createDataStreamResponse({
      execute: async (dataStream) => {
        const MCP_TOOLS = safe(mcpClientsManager.tools())
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map((tools) => {
            // filter tools by mentions
            if (mentions.length) {
              return filterMCPToolsByMentions(tools, mentions);
            }
            // filter tools by allowed mcp servers
            return filterMCPToolsByAllowedMCPServers(tools, allowedMcpServers);
          })
          .orElse({});

        const WORKFLOW_TOOLS = await safe(() =>
          workflowRepository.selectToolByIds(
            mentions
              .filter((m) => m.type == "workflow")
              .map((v) => v.workflowId),
          ),
        )
          .map((v) =>
            v.map((workflow) =>
              workflowToVercelAITools({
                ...workflow,
                dataStream,
              }),
            ),
          )
          .map((workflowTools) =>
            workflowTools.reduce(
              (prev, cur) => {
                prev[cur._toolName] = cur;
                return prev;
              },
              {} as Record<string, VercelAIWorkflowTool>,
            ),
          )
          .orElse({});

        const inProgressToolStep = extractInProgressToolPart(
          messages.slice(-2),
        );

        if (inProgressToolStep) {
          const toolResult = await manualToolExecuteByLastMessage(
            inProgressToolStep,
            message,
            { ...MCP_TOOLS, ...WORKFLOW_TOOLS },
            request.signal,
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
            if (Object.keys(MCP_TOOLS ?? {}).length === 0)
              throw new Error("No tools found");
            return rememberMcpServerCustomizationsAction(session.user.id);
          })
          .map((v) => filterMcpServerCustomizations(MCP_TOOLS!, v))
          .orElse({});

        const systemPrompt = mergeSystemPrompt(
          buildUserSystemPrompt(session.user, userPreferences),
          buildProjectInstructionsSystemPrompt(thread?.instructions),
          buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
        );

        // Precompute toolChoice to avoid repeated tool calls
        const computedToolChoice =
          (isToolCallAllowed && mentions.length > 0 && inProgressToolStep) ||
          Object.keys(workflowToVercelAITools).length
            ? "required"
            : "auto";

        const vercelAITooles = safe(MCP_TOOLS)
          .map((t) => {
            if (!Object.keys(t).length) return undefined;
            const bindingTools =
              toolChoice === "manual" ? excludeToolExecution(t) : t;
            return {
              ...getAllowedDefaultToolkit(allowedAppDefaultToolkit),
              ...bindingTools,
              ...WORKFLOW_TOOLS, // Workflow Tool Not Supported Manual
            };
          })
          .unwrap();

        logger.debug(
          `tool mode: ${toolChoice}, binding tool count: ${Object.keys(vercelAITooles ?? {}).length}, model: ${chatModel?.provider}/${chatModel?.model}`,
        );

        const result = streamText({
          model,
          system: systemPrompt,
          messages,
          maxSteps: 10,
          experimental_continueSteps: true,
          toolCallStreaming: true,
          experimental_transform: smoothStream({ chunking: "word" }),
          maxRetries: 1,
          tools: vercelAITooles,
          toolChoice: computedToolChoice,
          onFinish: async ({ response, usage }) => {
            const appendMessages = appendResponseMessages({
              messages: messages.slice(-1),
              responseMessages: response.messages,
            });
            if (isLastMessageUserMessage) {
              await chatRepository.insertMessage({
                threadId: thread!.id,
                model: chatModel?.model ?? null,
                role: "user",
                parts: message.parts,
                attachments: message.experimental_attachments,
                id: message.id,
                annotations: appendAnnotations(message.annotations, {
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
                model: chatModel?.model ?? null,
                threadId: thread!.id,
                role: assistantMessage.role,
                id: assistantMessage.id,
                parts: (assistantMessage.parts as UIMessage["parts"]).map(
                  (v) => {
                    if (
                      v.type == "tool-invocation" &&
                      v.toolInvocation.state == "result" &&
                      isVercelAIWorkflowTool(v.toolInvocation.result)
                    ) {
                      return {
                        ...v,
                        toolInvocation: {
                          ...v.toolInvocation,
                          result: {
                            ...v.toolInvocation.result,
                            history: v.toolInvocation.result.history.map(
                              (h) => {
                                return {
                                  ...h,
                                  result: undefined,
                                };
                              },
                            ),
                          },
                        },
                      };
                    }
                    return v;
                  },
                ),
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
