import {
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
  tool as createTool,
  Tool,
  type UIMessage,
  Message,
  formatDataStreamPart,
} from "ai";

import {
  generateTitleFromUserMessageAction,
  rememberMcpBindingAction,
  rememberProjectInstructionsAction,
  rememberThreadAction,
} from "@/app/api/chat/actions";
import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";

import { mcpClientsManager } from "../mcp/mcp-manager";

import { chatService } from "lib/db/service";
import logger from "logger";
import { SYSTEM_TIME_PROMPT } from "lib/ai/prompts";
import { ChatMessageAnnotation, ToolInvocationUIPart } from "app-types/chat";
import { errorToString, generateUUID, objectFlow, toAny } from "lib/utils";
import { z } from "zod";
import { errorIf, safe } from "ts-safe";
import { callMcpToolAction } from "../mcp/actions";
import { extractMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { auth } from "../auth/auth";
import { redirect } from "next/navigation";
import { defaultTools } from "lib/ai/tools";
import { MCPServerBindingConfig } from "app-types/mcp";

const { insertMessage, insertThread, upsertMessage } = chatService;

export const maxDuration = 120;

const requestBodySchema = z.object({
  id: z.string().optional(),
  messages: z.array(z.any()) as z.ZodType<Message[]>,
  model: z.string(),
  projectId: z.string().optional(),
  action: z.enum(["update-assistant", "temporary-chat", ""]).optional(),
  toolChoice: z.enum(["auto", "none", "manual"]).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const {
      id,
      messages,
      model: modelName,
      action,
      projectId,
      toolChoice,
    } = requestBodySchema.parse(json);

    let thread = id ? await rememberThreadAction(id) : null;

    const session = await auth();

    if (!session?.user.id) {
      return redirect("/login");
    }

    const message = messages.at(-1)!;

    const isNoStore = action == "temporary-chat";

    if (!message) {
      return new Response("No user message found", { status: 400 });
    }

    if (!thread && !isNoStore) {
      const title = await generateTitleFromUserMessageAction({
        message,
        model: customModelProvider.getModel(modelName),
      });

      thread = await insertThread({
        title,
        id: id ?? generateUUID(),
        userId: session.user.id,
        projectId: projectId ?? null,
      });
    }

    const mcpBinding = id ? await rememberMcpBindingAction(id, "thread") : null;

    const projectInstructions = projectId
      ? await rememberProjectInstructionsAction(projectId)
      : null;

    const annotations: ChatMessageAnnotation[] =
      (message.annotations as ChatMessageAnnotation[]) ?? [];

    const mcpTools = mcpClientsManager.tools();

    const model = customModelProvider.getModel(modelName);
    const systemPrompt = mergeSystemPrompt(
      projectInstructions?.systemPrompt || "- You are a helpful assistant.",
      SYSTEM_TIME_PROMPT(session),
    );
    const isToolCallAllowed =
      !isToolCallUnsupportedModel(model) && toolChoice != "none";

    const requiredToolsAnnotations = annotations
      .flatMap((annotation) => annotation.requiredTools)
      .filter(Boolean) as string[];

    const tools = safe(mcpTools)
      .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
      .map((tools) => {
        if (requiredToolsAnnotations.length) {
          return filterToolsByMentions(requiredToolsAnnotations, tools);
        }
        if (isNoStore) {
          return {};
        }
        if (mcpBinding) {
          return filterToolsByMcpBinding(mcpBinding, tools);
        }
        return tools;
      })
      .map((tools) => {
        if (toolChoice == "manual") {
          return disableToolExecution(tools);
        }
        return tools;
      })
      .map((tools) => {
        return { ...defaultTools, ...tools };
      })
      .orElse(undefined);

    return createDataStreamResponse({
      execute: async (dataStream) => {
        const manualToolPart = extractMenualToolInvocationPart(message);

        if (toolChoice == "manual" && manualToolPart) {
          const toolResult = await manualToolExecute(manualToolPart);
          Object.assign(manualToolPart, {
            state: "result",
            result: toolResult,
          });

          dataStream.write(
            formatDataStreamPart("tool_result", {
              toolCallId: manualToolPart.toolInvocation.toolCallId,
              result: toolResult,
            }),
          );
        }

        const result = streamText({
          model,
          system: systemPrompt,
          messages,
          maxSteps: 10,
          experimental_transform: smoothStream({ chunking: "word" }),
          tools,
          toolChoice:
            isToolCallAllowed && requiredToolsAnnotations.length > 0
              ? "required"
              : "auto",
          onFinish: async ({ response, usage }) => {
            if (isNoStore) return;
            const appendMessages = appendResponseMessages({
              messages: [message],
              responseMessages: response.messages,
            });
            if (action !== "update-assistant" && message.role == "user") {
              await insertMessage({
                threadId: thread!.id,
                model: null,
                role: message.role,
                parts: message.parts!,
                attachments: [],
                id: message.id,
                annotations: appendAnnotations(message.annotations, {
                  usageTokens: usage.promptTokens,
                }),
              });
            }
            const assistantMessage = appendMessages.at(-1);
            if (assistantMessage) {
              dataStream.writeMessageAnnotation(usage.completionTokens);
              await upsertMessage({
                model: modelName,
                threadId: thread!.id,
                role: assistantMessage.role,
                id: assistantMessage.id,
                parts: assistantMessage.parts as UIMessage["parts"],
                attachments: [],
                annotations: appendAnnotations(assistantMessage.annotations, {
                  usageTokens: usage.completionTokens,
                }),
              });
            }
          },
        });
        result.consumeStream();
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error: any) => {
        logger.error(error);
        return JSON.stringify(error) || "Oops, an error occured!";
      },
    });
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message || "Oops, an error occured!", {
      status: 500,
    });
  }
}

function filterToolsByMcpBinding(
  mcpBinding: MCPServerBindingConfig,
  tools: Record<string, Tool>,
) {
  return objectFlow(tools).filter((_tool, key) => {
    const { serverName, toolName } = extractMCPToolId(key);
    const binding = mcpBinding[serverName];
    if (binding?.allowedTools) {
      return binding.allowedTools.includes(toolName);
    }
    return false;
  });
}

function filterToolsByMentions(
  mentions: string[],
  tools: Record<string, Tool>,
) {
  if (mentions.length === 0) {
    return tools;
  }
  return objectFlow(tools).filter((_tool, key) =>
    mentions.some((mention) => key.startsWith(mention)),
  );
}

function disableToolExecution(
  tool: Record<string, Tool>,
): Record<string, Tool> {
  return objectFlow(tool).map((value) => {
    return createTool({
      parameters: value.parameters,
      description: value.description,
    });
  });
}

function appendAnnotations(
  annotations: any[] = [],
  annotationsToAppend: ChatMessageAnnotation[] | ChatMessageAnnotation,
): ChatMessageAnnotation[] {
  const newAnnotations = Array.isArray(annotationsToAppend)
    ? annotationsToAppend
    : [annotationsToAppend];
  return [...annotations, ...newAnnotations];
}

function mergeSystemPrompt(...prompts: (string | undefined)[]) {
  return prompts
    .map((prompt) => prompt?.trim())
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function manualToolExecute(part: ToolInvocationUIPart) {
  const {
    result: clientAnswer,
    args,
    toolName,
  } = part.toolInvocation as Extract<
    ToolInvocationUIPart["toolInvocation"],
    {
      state: "result";
    }
  >;

  if (!clientAnswer)
    return "The user chose not to run the tool. Please suggest an alternative approach, continue the conversation without it, or ask for clarification if needed.";

  const toolId = extractMCPToolId(toolName);

  return safe(() => callMcpToolAction(toolId.serverName, toolId.toolName, args))
    .ifFail((error) => ({
      isError: true,
      statusMessage: `tool call fail: ${toolName}`,
      error: errorToString(error),
    }))
    .unwrap();
}

function extractMenualToolInvocationPart(
  message: Message,
): ToolInvocationUIPart | null {
  const lastPart = message.parts?.at(-1);
  if (!lastPart) return null;
  if (lastPart.type != "tool-invocation") return null;
  if (typeof toAny(lastPart.toolInvocation)?.result != "boolean") return null;
  return lastPart!;
}
