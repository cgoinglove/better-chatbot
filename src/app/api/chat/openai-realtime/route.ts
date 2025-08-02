import { NextRequest } from "next/server";
import { getSession } from "auth/server";
import { AllowedMCPServer, VercelAIMcpTool } from "app-types/mcp";
import { userRepository } from "lib/db/repository";
import {
  filterMcpServerCustomizations,
  filterMCPToolsByAllowedMCPServers,
  mergeSystemPrompt,
} from "../shared.chat";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildSpeechSystemPrompt,
} from "lib/ai/prompts";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { safe } from "ts-safe";
import { DEFAULT_VOICE_TOOLS } from "lib/ai/speech";
import {
  rememberAgentAction,
  rememberMcpServerCustomizationsAction,
} from "../actions";
import globalLogger from "lib/logger";
import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `OpenAI Realtime API: `),
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not set" }),
        {
          status: 500,
        },
      );
    }

    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { voice, allowedMcpServers, agentId } = (await request.json()) as {
      model: string;
      voice: string;
      agentId?: string;
      allowedMcpServers: Record<string, AllowedMCPServer>;
    };

    const mcpTools = await mcpClientsManager.tools();

    const agent = await rememberAgentAction(agentId, session.user.id);

    agent && logger.info(`Agent: ${agent.name}`);

    const tools = safe(mcpTools)
      .map((tools) => {
        return filterMCPToolsByAllowedMCPServers(tools, allowedMcpServers);
      })
      .orElse(undefined);

    if (tools) {
      logger.info(`Tools: ${Object.keys(tools).join(", ")}`);
    } else {
      logger.info(`No tools found`);
    }

    const userPreferences = await userRepository.getPreferences(
      session.user.id,
    );

    const mcpServerCustomizations = await safe()
      .map(() => {
        if (Object.keys(tools ?? {}).length === 0)
          throw new Error("No tools found");
        return rememberMcpServerCustomizationsAction(session.user.id);
      })
      .map((v) => filterMcpServerCustomizations(tools!, v))
      .orElse({});

    const openAITools = Object.entries(tools ?? {}).map(([name, tool]) => {
      return vercelAIToolToOpenAITool(tool, name);
    });

    const systemPrompt = mergeSystemPrompt(
      buildSpeechSystemPrompt(
        session.user,
        userPreferences ?? undefined,
        agent,
      ),
      buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
    );

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: voice || "alloy",
        input_audio_transcription: {
          model: "whisper-1",
        },
        instructions: systemPrompt,
        tools: [...openAITools, ...DEFAULT_VOICE_TOOLS],
      }),
    });

    return new Response(r.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

function vercelAIToolToOpenAITool(tool: VercelAIMcpTool, name: string) {
  return {
    name,
    type: "function",
    description: tool.description,
    parameters: tool.parameters?.jsonSchema ?? {
      type: "object",
      properties: {},
      required: [],
    },
  };
}
