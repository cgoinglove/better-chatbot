import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  Tool,
  UIMessage,
} from "ai";

import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

import {
  agentRepository,
  chatRepository,
  projectRepository,
} from "lib/db/repository";
import globalLogger from "logger";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildUserSystemPrompt,
  buildToolCallUnsupportedModelSystemPrompt,
} from "lib/ai/prompts";
import {
  chatApiSchemaRequestBodySchema,
  ChatMention,
  ChatMetadata,
} from "app-types/chat";

import { errorIf, safe } from "ts-safe";

import {
  excludeToolExecution,
  handleError,
  manualToolExecuteByLastMessage,
  mergeSystemPrompt,
  extractInProgressToolPart,
  filterMcpServerCustomizations,
  loadMcpTools,
  loadWorkFlowTools,
  loadAppDefaultTools,
  convertToSavePart,
} from "./shared.chat";
import {
  rememberAgentAction,
  rememberMcpServerCustomizationsAction,
} from "./actions";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";
import { nanoBananaTool, openaiImageTool } from "lib/ai/tools/image";
import { ImageToolName } from "lib/ai/tools";
import { buildCsvIngestionPreviewParts } from "@/lib/ai/ingest/csv-ingest";
import { buildExcelIngestionPreviewParts } from "@/lib/ai/ingest/excel-ingest";
import { serverFileStorage } from "lib/file-storage";
import { createExecutePythonTool } from "lib/ai/tools/code/execute-python-server";
import type { E2BExecutionResult } from "lib/e2b/types";

/**
 * Strip base64 images from execute_python tool results in the message history.
 * Images can be 50k+ tokens each — the model only needs stdout/stderr to
 * continue analysis. Images are already shown in the ArtifactsPanel on the client.
 * In AI SDK v5, tool parts have type "tool-{toolName}" and result is in `output`.
 */
function stripImagesFromHistory(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "assistant") return msg;
    const parts = msg.parts?.map((part: any) => {
      if (
        part.type === "tool-execute_python" &&
        part.state === "output-available" &&
        part.output?.images?.length
      ) {
        const output = part.output as E2BExecutionResult;
        return { ...part, output: { ...output, images: [] } };
      }
      return part;
    });
    return { ...msg, parts };
  });
}

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
      imageTool,
      mentions = [],
      attachments = [],
    } = chatApiSchemaRequestBodySchema.parse(json);

    const model = customModelProvider.getModel(chatModel);

    let thread = await chatRepository.selectThreadDetails(id);

    if (!thread) {
      logger.info(`create chat thread: ${id}`);
      const newThread = await chatRepository.insertThread({
        id,
        title: "",
        userId: session.user.id,
      });
      thread = await chatRepository.selectThreadDetails(newThread.id);
    }

    if (thread!.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const projectContext = thread?.projectId
      ? await projectRepository.selectProjectById(
          thread.projectId,
          session.user.id,
        )
      : null;

    const projectFiles = projectContext
      ? await projectRepository.selectProjectFiles(thread!.projectId!)
      : [];

    const messages: UIMessage[] = (thread?.messages ?? []).map((m) => {
      return {
        id: m.id,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata,
      };
    });

    if (messages.at(-1)?.id == message.id) {
      messages.pop();
    }
    const [ingestionPreviewParts, excelIngestionPreviewParts] =
      await Promise.all([
        buildCsvIngestionPreviewParts(attachments, (key) =>
          serverFileStorage.download(key),
        ),
        buildExcelIngestionPreviewParts(attachments, (key) =>
          serverFileStorage.download(key),
        ),
      ]);
    const allIngestionParts = [
      ...ingestionPreviewParts,
      ...excelIngestionPreviewParts,
    ];

    if (allIngestionParts.length) {
      const baseParts = [...message.parts];
      let insertionIndex = -1;
      for (let i = baseParts.length - 1; i >= 0; i -= 1) {
        if (baseParts[i]?.type === "text") {
          insertionIndex = i;
          break;
        }
      }
      if (insertionIndex !== -1) {
        baseParts.splice(insertionIndex, 0, ...allIngestionParts);
        message.parts = baseParts;
      } else {
        message.parts = [...baseParts, ...allIngestionParts];
      }
    }

    if (attachments.length) {
      const firstTextIndex = message.parts.findIndex(
        (part: any) => part?.type === "text",
      );
      const attachmentParts: any[] = [];

      attachments.forEach((attachment) => {
        const exists = message.parts.some(
          (part: any) =>
            part?.type === attachment.type && part?.url === attachment.url,
        );
        if (exists) return;

        if (attachment.type === "file") {
          attachmentParts.push({
            type: "file",
            url: attachment.url,
            mediaType: attachment.mediaType,
            filename: attachment.filename,
          });
        } else if (attachment.type === "source-url") {
          attachmentParts.push({
            type: "source-url",
            url: attachment.url,
            mediaType: attachment.mediaType,
            title: attachment.filename,
          });
        }
      });

      if (attachmentParts.length) {
        if (firstTextIndex >= 0) {
          message.parts = [
            ...message.parts.slice(0, firstTextIndex),
            ...attachmentParts,
            ...message.parts.slice(firstTextIndex),
          ];
        } else {
          message.parts = [...message.parts, ...attachmentParts];
        }
      }
    }

    messages.push(message);

    const supportToolCall = !isToolCallUnsupportedModel(model);

    const agentId = (
      mentions.find((m) => m.type === "agent") as Extract<
        ChatMention,
        { type: "agent" }
      >
    )?.agentId;

    const agent = await rememberAgentAction(agentId, session.user.id);

    const agentFiles = agent?.id
      ? await agentRepository.selectAgentFiles(agent.id)
      : [];

    if (agent?.instructions?.mentions) {
      mentions.push(...agent.instructions.mentions);
    }

    const useImageTool = Boolean(imageTool?.model);

    const isToolCallAllowed =
      supportToolCall &&
      (toolChoice != "none" || mentions.length > 0) &&
      !useImageTool;

    const EXECUTE_PYTHON_TOOL: Record<string, Tool> =
      isToolCallAllowed && process.env.E2B_API_KEY
        ? { execute_python: createExecutePythonTool(thread!.id) }
        : {};

    const metadata: ChatMetadata = {
      agentId: agent?.id,
      toolChoice: toolChoice,
      toolCount: 0,
      chatModel: chatModel,
    };

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const mcpClients = await mcpClientsManager.getClients();
        const mcpTools = await mcpClientsManager.tools();
        logger.info(
          `mcp-server count: ${mcpClients.length}, mcp-tools count :${Object.keys(mcpTools).length}`,
        );
        const MCP_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadMcpTools({
              mentions,
              allowedMcpServers,
            }),
          )
          .orElse({});

        const WORKFLOW_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadWorkFlowTools({
              mentions,
              dataStream,
            }),
          )
          .orElse({});

        const APP_DEFAULT_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadAppDefaultTools({
              mentions,
              allowedAppDefaultToolkit,
            }),
          )
          .orElse({});
        const inProgressToolParts = extractInProgressToolPart(message);
        if (inProgressToolParts.length) {
          await Promise.all(
            inProgressToolParts.map(async (part) => {
              const output = await manualToolExecuteByLastMessage(
                part,
                { ...MCP_TOOLS, ...WORKFLOW_TOOLS, ...APP_DEFAULT_TOOLS },
                request.signal,
              );
              part.output = output;

              dataStream.write({
                type: "tool-output-available",
                toolCallId: part.toolCallId,
                output,
              });
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
          buildUserSystemPrompt(session.user, userPreferences, agent),
          buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
          !supportToolCall && buildToolCallUnsupportedModelSystemPrompt,
          projectContext?.instructions
            ? `Project instructions:\n${projectContext.instructions}`
            : false,
          projectContext?.memory
            ? `Project memory (key facts from prior conversations):\n${projectContext.memory}`
            : false,
        );

        const IMAGE_TOOL: Record<string, Tool> = useImageTool
          ? {
              [ImageToolName]:
                imageTool?.model === "google"
                  ? nanoBananaTool
                  : openaiImageTool,
            }
          : {};
        const vercelAITooles = safe({
          ...MCP_TOOLS,
          ...WORKFLOW_TOOLS,
        })
          .map((t) => {
            const bindingTools =
              toolChoice === "manual" ||
              (message.metadata as ChatMetadata)?.toolChoice === "manual"
                ? excludeToolExecution(t)
                : t;
            return {
              ...bindingTools,
              ...APP_DEFAULT_TOOLS, // APP_DEFAULT_TOOLS Not Supported Manual
              ...IMAGE_TOOL,
            };
          })
          .unwrap();
        metadata.toolCount = Object.keys(vercelAITooles).length;

        const allowedMcpTools = Object.values(allowedMcpServers ?? {})
          .map((t) => t.tools)
          .flat();

        logger.info(
          `${agent ? `agent: ${agent.name}, ` : ""}tool mode: ${toolChoice}, mentions: ${mentions.length}`,
        );

        logger.info(
          `allowedMcpTools: ${allowedMcpTools.length ?? 0}, allowedAppDefaultToolkit: ${allowedAppDefaultToolkit?.length ?? 0}`,
        );
        if (useImageTool) {
          logger.info(`binding tool count Image: ${imageTool?.model}`);
        } else {
          logger.info(
            `binding tool count APP_DEFAULT: ${Object.keys(APP_DEFAULT_TOOLS ?? {}).length}, MCP: ${Object.keys(MCP_TOOLS ?? {}).length}, Workflow: ${Object.keys(WORKFLOW_TOOLS ?? {}).length}`,
          );
        }
        logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);

        if (projectFiles.length > 0) {
          const projectFileParts = await Promise.all(
            projectFiles.map(async (f) => {
              try {
                const url = await serverFileStorage.getSourceUrl(f.storageKey);
                if (!url) return null;
                return {
                  type: "file" as const,
                  url,
                  mediaType: f.contentType,
                  filename: f.filename,
                };
              } catch {
                return null;
              }
            }),
          );
          const validParts = projectFileParts.filter(
            (p): p is NonNullable<typeof p> => p !== null,
          );
          if (validParts.length > 0 && messages.length > 0) {
            messages[0] = {
              ...messages[0],
              parts: [...validParts, ...(messages[0].parts ?? [])],
            };
          }
        }

        if (agentFiles.length > 0) {
          const agentFileParts = await Promise.all(
            agentFiles.map(async (f) => {
              try {
                const url = await serverFileStorage.getSourceUrl(f.storageKey);
                if (!url) return null;
                return {
                  type: "file" as const,
                  url,
                  mediaType: f.contentType,
                  filename: f.filename,
                };
              } catch {
                return null;
              }
            }),
          );
          const validAgentFileParts = agentFileParts.filter(
            (p): p is NonNullable<typeof p> => p !== null,
          );
          if (validAgentFileParts.length > 0 && messages.length > 0) {
            messages[0] = {
              ...messages[0],
              parts: [...validAgentFileParts, ...(messages[0].parts ?? [])],
            };
          }
        }

        const result = streamText({
          model,
          system: systemPrompt,
          messages: convertToModelMessages(stripImagesFromHistory(messages)),
          experimental_transform: smoothStream({ chunking: "word" }),
          maxRetries: 2,
          tools: { ...EXECUTE_PYTHON_TOOL, ...vercelAITooles },
          stopWhen: stepCountIs(10),
          toolChoice: "auto",
          abortSignal: request.signal,
        });
        result.consumeStream();
        dataStream.merge(
          result.toUIMessageStream({
            messageMetadata: ({ part }) => {
              if (part.type == "finish") {
                metadata.usage = part.totalUsage;
                return metadata;
              }
            },
          }),
        );
      },

      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        if (responseMessage.id == message.id) {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            ...responseMessage,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        } else {
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: message.role,
            parts: message.parts.map(convertToSavePart),
            id: message.id,
          });
          await chatRepository.upsertMessage({
            threadId: thread!.id,
            role: responseMessage.role,
            id: responseMessage.id,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        }

        if (agent) {
          agentRepository.updateAgent(agent.id, session.user.id, {
            updatedAt: new Date(),
          } as any);
        }

        if (
          projectContext &&
          responseMessage.parts.some((p) => p.type === "text")
        ) {
          void (async () => {
            try {
              const lastExchange = messages.slice(-2).map((m) => ({
                role: m.role,
                text: (m.parts ?? [])
                  .filter((p) => p.type === "text")
                  .map((p) => (p as { type: "text"; text: string }).text)
                  .join(""),
              }));

              const { generateText } = await import("ai");
              const { text: newMemory } = await generateText({
                model,
                system: `You maintain a project memory. Given the existing memory and a new conversation exchange, update the memory to include any new facts, decisions, or context worth remembering. Keep the total under 500 words. Return ONLY the updated memory text.`,
                prompt: `Existing memory:\n${projectContext.memory || "(none)"}\n\nNew exchange:\n${lastExchange.map((m) => `${m.role}: ${m.text}`).join("\n\n")}`,
                maxOutputTokens: 600,
              });

              await projectRepository.updateProjectMemory(
                projectContext.id,
                session.user.id,
                newMemory,
              );
            } catch (err) {
              logger.error("Project memory update failed:", err);
            }
          })();
        }
      },
      onError: handleError,
      originalMessages: messages,
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error: any) {
    logger.error(error);
    return Response.json({ message: error.message }, { status: 500 });
  }
}
