import {
  Tool,
  type UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from "ai";

import { generateTitleFromUserMessageAction } from "@/app/api/chat/actions";
import { customModelProvider, isToolCallUnsupported } from "lib/ai/models";
import { aiTools } from "lib/ai/tools";

import { ChatMessageAnnotation } from "app-types/chat";
import { RuleEngine } from "lib/ai/rule-engine";
import { chatService } from "lib/db/chat-service";
import { fileService } from "lib/db/file-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { mcpClientsManager } from "../mcp/mcp-manager";

const { insertMessage, insertThread, selectThread } = chatService;

export const maxDuration = 120;

// Get system prompt with rules
async function getSystemPrompt(userId: string): Promise<string> {
  const ruleEngine = RuleEngine.getInstance();
  const systemPrompt = await ruleEngine.generateSystemPrompt(userId);
  return (
    systemPrompt ||
    "You are a helpful AI assistant that can use tools when needed."
  );
}

const filterToolsByMentions = (
  mentions: string[],
  tools: Record<string, Tool>,
) => {
  return Object.fromEntries(
    Object.keys(tools)
      .filter((tool) => mentions.some((mention) => tool.startsWith(mention)))
      .map((tool) => [tool, tools[tool]]),
  );
};

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const {
      id,
      messages,
      model: modelName,
      action,
      activeTool,
    } = json as {
      id?: string;
      messages: Array<UIMessage>;
      model: string;
      action?: "update-assistant" | "";
      activeTool?: boolean;
    };

    let thread = id ? await selectThread(id) : null;

    const userId = getMockUserSession().id;

    const message = messages
      .filter((message) => message.role === "user")
      .at(-1);

    if (!message) {
      return new Response("No user message found", { status: 400 });
    }

    if (!thread) {
      const title = await generateTitleFromUserMessageAction({
        message,
        model: customModelProvider.getModel(modelName),
      });

      thread = await insertThread({
        title,
        id,
        userId,
      });
    }

    const annotations: ChatMessageAnnotation[] =
      (message.annotations as ChatMessageAnnotation[]) ?? [];

    const requiredTools = annotations
      .flatMap((annotation) => annotation.requiredTools)
      .filter(Boolean) as string[];

    // Combine MCP tools with direct AI tools
    const mcpTools = mcpClientsManager.tools();
    const tools = { ...mcpTools, ...aiTools };

    const model = customModelProvider.getModel(modelName);

    const toolChoice = !activeTool ? "none" : "auto";

    // Get system prompt with rules
    const systemPrompt = await getSystemPrompt(userId);

    return createDataStreamResponse({
      // Pass initial data with threadId
      initialData: {
        threadId: thread.id,
      },
      execute: (dataStream) => {
        const result = streamText({
          model,
          system: systemPrompt,
          messages,
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: isToolCallUnsupported(model)
            ? undefined
            : requiredTools.length
              ? filterToolsByMentions(requiredTools, tools)
              : tools,
          maxSteps: 5,
          toolChoice,
          onFinish: async ({ response }) => {
            // Make sure response and response.messages exist before proceeding
            if (!response || !response.messages) {
              console.error("Invalid response in onFinish:", response);
              return;
            }

            const [, assistantMessage] = appendResponseMessages({
              messages: [message],
              responseMessages: response.messages,
            });

            // Make sure thread exists before proceeding
            if (!thread || !thread.id) {
              console.error("Thread is undefined or missing ID in onFinish");
              return;
            }

            if (action !== "update-assistant") {
              // Extract file attachments from message parts
              const fileAttachments = message.parts
                .filter((part) => part.type === "file-attachment")
                .map((part) => (part as any).file_attachment);

              await insertMessage({
                threadId: thread.id,
                model: null,
                role: "user",
                parts: message.parts,
                attachments: fileAttachments,
                id: message.id,
              });

              // Create file attachments in the database
              for (const attachment of fileAttachments) {
                try {
                  await fileService.createAttachment({
                    fileId: attachment.id,
                    messageId: message.id,
                    filename: attachment.filename,
                    mimetype: attachment.mimetype,
                    url: attachment.url,
                    thumbnailUrl: attachment.thumbnailUrl,
                  });
                } catch (error) {
                  logger.error("Error creating file attachment:", error);
                }
              }
            }

            await insertMessage({
              model: modelName,
              threadId: thread.id,
              role: "assistant",
              id: assistantMessage.id,
              parts: assistantMessage.parts as UIMessage["parts"],
              attachments: [],
            });
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
