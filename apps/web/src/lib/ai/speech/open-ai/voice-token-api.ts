import type { ChatMention } from "app-types/chat";

/** Token route URL — agent/MCP context via query (never in gateway sessionConfig). */
export function buildVoiceTokenApiUrl(
  agentId?: string,
  mentions?: ChatMention[],
): string {
  const params = new URLSearchParams();
  if (agentId) {
    params.set("agentId", agentId);
  }
  if (mentions && mentions.length > 0) {
    params.set("mentions", JSON.stringify(mentions));
  }
  const qs = params.toString();
  return `/api/chat/openai-realtime${qs ? `?${qs}` : ""}`;
}

export function parseVoiceTokenMentionsParam(
  value: string | null,
): ChatMention[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as ChatMention[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
