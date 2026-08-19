export const VOICE_REALTIME_MODEL = "openai/gpt-realtime-2";

const sanitize = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export function getAiGatewayBaseUrl(): string | undefined {
  return sanitize(
    process.env.AI_GATEWAY_URL ??
      process.env.AI_GATEWAY_BASE_URL ??
      process.env.VERCEL_AI_GATEWAY_URL ??
      process.env.VERCEL_AI_GATEWAY_BASE_URL ??
      process.env.VERCEL_AI_URL,
  );
}

export function getAiGatewayApiKey(): string | undefined {
  return sanitize(
    process.env.AI_GATEWAY_API_KEY ??
      process.env.VERCEL_AI_GATEWAY_API_KEY ??
      process.env.VERCEL_AI_API_KEY ??
      process.env.VERCEL_AI_GATEWAY_TOKEN ??
      process.env.VERCEL_AI_TOKEN,
  );
}

export function isAiGatewayConfigured(): boolean {
  return Boolean(getAiGatewayApiKey());
}

export function getAiGatewayTeamIdOrSlug(): string | undefined {
  return sanitize(
    process.env.AI_GATEWAY_TEAM_ID_OR_SLUG ??
      process.env.VERCEL_AI_GATEWAY_TEAM_ID ??
      process.env.VERCEL_AI_GATEWAY_TEAM_SLUG,
  );
}
