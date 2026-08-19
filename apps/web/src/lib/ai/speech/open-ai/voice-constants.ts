/** Voice names supported by openai/gpt-realtime-2 via AI Gateway. */
export const OPENAI_VOICE = {
  Alloy: "alloy",
  Ballad: "ballad",
  Sage: "sage",
  Shimmer: "shimmer",
  Verse: "verse",
  Echo: "echo",
  Coral: "coral",
  Ash: "ash",
} as const;

export type OpenAIVoiceName = (typeof OPENAI_VOICE)[keyof typeof OPENAI_VOICE];

/** WebSocket subprotocol contract (mirrors @ai-sdk/gateway). */
export const GATEWAY_REALTIME_SUBPROTOCOL = "ai-gateway-realtime.v1";
export const GATEWAY_AUTH_SUBPROTOCOL_PREFIX = "ai-gateway-auth.";
export const GATEWAY_TEAM_SUBPROTOCOL_PREFIX = "ai-gateway-team.";

function encodeSubprotocolValue(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

export function getGatewayRealtimeWebSocketProtocols(
  token: string,
  options?: { teamIdOrSlug?: string },
): string[] {
  const protocols = [
    GATEWAY_REALTIME_SUBPROTOCOL,
    `${GATEWAY_AUTH_SUBPROTOCOL_PREFIX}${token}`,
  ];
  if (options?.teamIdOrSlug) {
    protocols.push(
      `${GATEWAY_TEAM_SUBPROTOCOL_PREFIX}${encodeSubprotocolValue(options.teamIdOrSlug)}`,
    );
  }
  return protocols;
}
