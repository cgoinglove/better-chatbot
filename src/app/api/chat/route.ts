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

import { Tool } from "lib/ai/tool";

import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";
import { createDocument } from "lib/ai/tools/create-document";
import { updateDocument } from "lib/ai/tools/update-document";

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

import { errorIf, safe } from "ts-safe";

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
} from "./helper";
import { generateTitleFromUserMessageAction } from "./actions";
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
      model: modelName,
      toolChoice,
      allowedAppDefaultToolkit,
      allowedMcpServers,
      projectId,
    } = chatApiSchemaRequestBodySchema.parse(json);

    const model = customModelProvider.getModel(modelName);

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

    // if is false, it means the last message is manual tool execution
    const isLastMessageUserMessage = isUserMessage(message);

    const previousMessages = (thread?.messages ?? []).map(convertToMessage);

    if (!thread) {
      return new Response("Thread not found", { status: 404 });
    }

    const annotations = (message?.annotations as ChatMessageAnnotation[]) ?? [];

    const mcpTools = mcpClientsManager.tools();

    const isToolCallAllowed =
      !isToolCallUnsupportedModel(model) && toolChoice != "none";

    const requiredToolsAnnotations = annotations
      .flatMap((annotation) => annotation.requiredTools)
      .filter(Boolean) as string[];

    const artifactTools = [
      'createDocument',
      'updateDocument',
    ];

    const defaultToolkit = getAllowedDefaultToolkit();
    const filteredDefaultToolkit = filterToolsByAllowedMCPServers(
      defaultToolkit,
      allowedMcpServers,
    );

    const filteredToolkit = filterToolsByMentions(
      [...filteredDefaultToolkit, ...artifactTools],
      requiredToolsAnnotations,
      toolChoice,
    );

    const allowedToolkit = json.toolChoice === "none"
      ? []
      : filteredToolkit;

    const toolsForModel = isToolCallUnsupportedModel(json.model)
      ? []
      : allowedToolkit;

    const tools = safe(mcpTools)
      .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
      .map((mcpTools) => {
        const filteredTools = filterToolsByMentions(
          mcpTools,
          json.messages,
        );

        const filteredToolsByAllowedMCPServers = filterToolsByAllowedMCPServers(
          filteredTools,
          allowedMcpServers,
        );

        const toolSet: Record<string, Tool> = {
          ...filteredToolsByAllowedMCPServers,
        };

        if (json.toolChoice !== "none") {
          toolSet.createDocument = createDocument({ session: json.session, dataStream: json.dataStream });
          toolSet.updateDocument = updateDocument({ session: json.session, dataStream: json.dataStream });
        }

        return toolSet;
      })
      .map((toolSet) => {
        if (toolChoice === "manual") {
          return excludeToolExecution(toolSet);
        }
        return {
          ...toolsForModel,
          ...toolSet,
        };
      })
      .orElse({}) as Record<string, Tool>;

    const updatedMessages = isLastMessageUserMessage
      ? appendClientMessage({
          messages: previousMessages,
          message,
        })
      : previousMessages;

    return new Response(JSON.stringify({
      messages: updatedMessages,
      tools,
    }));
          const toolResult = await manualToolExecuteByLastMessage(
            inProgressToolStep,
            message,
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
