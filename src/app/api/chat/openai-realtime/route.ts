import { NextRequest } from "next/server";
import { getSession } from "auth/server";
import { AllowedMCPServer } from "app-types/mcp";
import { chatRepository } from "lib/db/repository";
import { filterToolsByAllowedMCPServers, mergeSystemPrompt } from "../helper";
import {
  buildProjectInstructionsSystemPrompt,
  buildSpeechSystemPrompt,
} from "lib/ai/prompts";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { errorIf, safe } from "ts-safe";
import { DEFAULT_VOICE_TOOLS } from "lib/ai/speech";

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

    const { voice, allowedMcpServers, toolChoice, threadId, projectId } =
      (await request.json()) as {
        model: string;
        voice: string;
        allowedMcpServers: Record<string, AllowedMCPServer>;
        toolChoice: "auto" | "none" | "manual";
        projectId?: string;
        threadId?: string;
      };

    const { instructions, userPreferences } = projectId
      ? await chatRepository.selectThreadInstructionsByProjectId(
          session.user.id,
          projectId,
        )
      : await chatRepository.selectThreadInstructions(
          session.user.id,
          threadId,
        );

    const systemPrompt = mergeSystemPrompt(
      buildSpeechSystemPrompt(session.user, userPreferences),
      buildProjectInstructionsSystemPrompt(instructions),
    );

    const mcpTools = mcpClientsManager.tools();

    const tools = safe(mcpTools)
      .map(errorIf(() => toolChoice === "none" && "Not allowed"))
      .map((tools) => {
        return filterToolsByAllowedMCPServers(tools, allowedMcpServers);
      })
      .map((tools) => {
        return Object.entries(tools).map(([name, tool]) => {
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
        });
      })
      .map((tools) => {
        return [...tools, ...DEFAULT_VOICE_TOOLS];
      })
      .orElse(undefined);

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
        tools: tools,
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
