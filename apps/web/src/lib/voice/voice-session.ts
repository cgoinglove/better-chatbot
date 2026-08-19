import { Agent } from "app-types/agent";
import { ChatMention } from "app-types/chat";
import {
  filterMcpServerCustomizations,
  loadMcpToolsStateless,
  mergeSystemPrompt,
} from "@/app/api/chat/shared.chat";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildSpeechSystemPrompt,
} from "lib/ai/prompts";
import { userRepository } from "lib/db/repository";
import { getUserPreferences } from "lib/user/server";
import { safe } from "ts-safe";
import {
  rememberAgentAction,
  rememberMcpServerCustomizationsAction,
} from "@/app/api/chat/actions";
import { VoiceActor } from "./types";

export type VoiceAgentContext = {
  agent?: Agent;
  enabledMentions: ChatMention[];
  mcpTools: Awaited<ReturnType<typeof loadMcpToolsStateless>>;
  systemPrompt: string;
};

/**
 * Returns true only when the mention list explicitly references an MCP tool or
 * server. Used to skip the per-server connect+introspect round-trip on plain
 * voice commands that don't need MCP (the common case).
 */
function hasMcpMentions(mentions: ChatMention[]): boolean {
  return mentions.some((m) => m.type === "mcpTool" || m.type === "mcpServer");
}

export async function buildVoiceAgentContext({
  actor,
  agentId,
  mentions,
}: {
  actor: VoiceActor;
  agentId?: string;
  mentions: ChatMention[];
}): Promise<VoiceAgentContext> {
  const user = await userRepository.getUserById(actor.userId);
  if (!user) {
    throw new Error("User not found");
  }

  const agent = await rememberAgentAction(
    agentId,
    actor.userId,
    actor.organizationId,
  );
  const enabledMentions = agent?.instructions.mentions ?? mentions;

  // Only introspect MCP servers when the command or agent instructions
  // explicitly mention an MCP tool/server. Connecting to every server on every
  // voice command is the main latency and reliability risk under load.
  const mcpTools = hasMcpMentions(enabledMentions)
    ? await loadMcpToolsStateless(actor.userId, { mentions: enabledMentions })
    : {};

  const userPreferences = await getUserPreferences(actor.userId);
  const mcpServerCustomizations = await safe()
    .map(() => {
      if (Object.keys(mcpTools).length === 0) throw new Error("No tools found");
      return rememberMcpServerCustomizationsAction(actor.userId);
    })
    .map((value) => filterMcpServerCustomizations(mcpTools, value))
    .orElse({});

  const systemPrompt = mergeSystemPrompt(
    buildSpeechSystemPrompt(user, userPreferences ?? undefined, agent),
    buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
  );

  return {
    agent: agent ?? undefined,
    enabledMentions,
    mcpTools,
    systemPrompt,
  };
}
