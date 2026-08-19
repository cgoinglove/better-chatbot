import { ChatMention } from "app-types/chat";
import { withAuth } from "auth/route-guard";
import { colorize } from "consola/utils";
import { parseVoiceTokenMentionsParam } from "lib/ai/speech/open-ai/voice-token-api";
import { getVoiceGateway } from "lib/ai/speech/voice-gateway.server";
import {
  VOICE_REALTIME_MODEL,
  getAiGatewayTeamIdOrSlug,
  isAiGatewayConfigured,
} from "lib/ai/speech/voice-realtime-config";
import globalLogger from "lib/logger";
import { buildOpenAIRealtimeToolSetup } from "lib/voice/openai-tools";
import { buildVoiceAgentContext } from "lib/voice/voice-session";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Voice Realtime Gateway: `),
});

function resolveVoiceRequestContext(
  request: Request,
  body: {
    sessionConfig?: {
      providerOptions?: {
        voiceChat?: { agentId?: string; mentions?: ChatMention[] };
      };
    };
    agentId?: string;
    mentions?: ChatMention[];
  },
) {
  const url = new URL(request.url);
  const voiceChatMeta = body.sessionConfig?.providerOptions?.voiceChat;
  const queryMentions = parseVoiceTokenMentionsParam(
    url.searchParams.get("mentions"),
  );

  return {
    agentId:
      voiceChatMeta?.agentId ??
      body.agentId ??
      url.searchParams.get("agentId") ??
      undefined,
    mentions:
      queryMentions.length > 0
        ? queryMentions
        : (voiceChatMeta?.mentions ?? body.mentions ?? []),
  };
}

export const POST = withAuth(async (request, session) => {
  try {
    if (!isAiGatewayConfigured()) {
      return new Response(
        JSON.stringify({
          error:
            "AI Gateway is not configured. Set AI_GATEWAY_API_KEY (or VERCEL_AI_GATEWAY_API_KEY).",
        }),
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      sessionConfig?: {
        voice?: string;
        providerOptions?: {
          voiceChat?: {
            agentId?: string;
            mentions?: ChatMention[];
          };
        };
      };
      sessionOnly?: boolean;
      agentId?: string;
      mentions?: ChatMention[];
    };

    const { agentId, mentions } = resolveVoiceRequestContext(request, body);

    const organizationId =
      (session.session as { activeOrganizationId?: string } | undefined)
        ?.activeOrganizationId ?? null;

    agentId && logger.info(`[${agentId}] Agent requested`);

    const context = await buildVoiceAgentContext({
      actor: {
        userId: session.user.id,
        organizationId,
        source: "browser",
      },
      agentId,
      mentions,
    });

    context.agent && logger.info(`Agent: ${context.agent.name}`);

    const toolSetup = buildOpenAIRealtimeToolSetup({
      mcpTools: context.mcpTools,
      requestedMentions: context.enabledMentions,
    });
    logger.info(
      `MCP tools requested=${toolSetup.toolStatus.requested.length}, available=${toolSetup.toolStatus.available.length}, unavailable=${toolSetup.toolStatus.unavailable.length}`,
    );

    const teamIdOrSlug = getAiGatewayTeamIdOrSlug();

    if (body.sessionOnly) {
      return Response.json({
        instructions: context.systemPrompt,
        tools: toolSetup.tools,
        toolStatus: toolSetup.toolStatus,
        toolExecutionMap: toolSetup.toolExecutionMap,
        teamIdOrSlug,
      });
    }

    const voiceGateway = getVoiceGateway();

    const { token, url } = await voiceGateway.experimental_realtime.getToken({
      model: VOICE_REALTIME_MODEL,
    });

    return Response.json({
      token,
      url,
      tools: toolSetup.tools,
      toolStatus: toolSetup.toolStatus,
      toolExecutionMap: toolSetup.toolExecutionMap,
      instructions: context.systemPrompt,
      teamIdOrSlug,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create voice session";
    logger.error(`Session setup failed: ${message}`);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
