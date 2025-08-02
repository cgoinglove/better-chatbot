import { streamObject } from "ai";

import { customModelProvider } from "lib/ai/models";
import { buildAgentGenerationPrompt } from "lib/ai/prompts";
import globalLogger from "logger";
import { ChatModel } from "app-types/chat";

import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { AgentGenerateSchema } from "app-types/agent";
import { z } from "zod";
import { loadAppDefaultTools } from "../../chat/shared.chat";
import { workflowRepository } from "lib/db/repository";
import { safe } from "ts-safe";
import { objectFlow } from "lib/utils";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Agent Generate API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const { chatModel, message = "hello" } = json as {
      chatModel?: ChatModel;
      message: string;
    };

    logger.info(`chatModel: ${chatModel?.provider}/${chatModel?.model}`);

    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const toolNames = new Set<string>();

    await safe(loadAppDefaultTools)

      .ifOk((appTools) => {
        objectFlow(appTools).forEach((_, toolName) => {
          toolNames.add(toolName);
        });
      })
      .unwrap();

    await safe(mcpClientsManager.tools())
      .ifOk((tools) => {
        objectFlow(tools).forEach((mcp) => {
          toolNames.add(mcp._originToolName);
        });
      })
      .unwrap();

    await safe(workflowRepository.selectExecuteAbility(session.user.id))
      .ifOk((tools) => {
        tools.forEach((tool) => {
          toolNames.add(tool.name);
        });
      })
      .unwrap();

    const dynamicAgentSchema = AgentGenerateSchema.extend({
      tools: z
        .array(
          z.enum(
            Array.from(toolNames).length > 0
              ? ([
                  Array.from(toolNames)[0],
                  ...Array.from(toolNames).slice(1),
                ] as [string, ...string[]])
              : ([""] as [string]),
          ),
        )
        .describe("Agent allowed tools name")
        .optional()
        .default([]),
    });

    const system = buildAgentGenerationPrompt(Array.from(toolNames));

    const result = streamObject({
      model: customModelProvider.getModel(chatModel),
      system,
      prompt: message,
      schema: dynamicAgentSchema,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    logger.error(error);
  }
}
