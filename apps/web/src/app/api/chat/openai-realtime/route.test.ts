import { jsonSchema } from "ai";
import type { ChatMention } from "app-types/chat";
import type { VercelAIMcpTool } from "app-types/mcp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  buildVoiceAgentContext: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock("auth/server", () => ({
  getSession: vi.fn().mockResolvedValue({
    user: { id: "user-1" },
    session: { activeOrganizationId: "organization-1" },
  }),
}));

vi.mock("lib/ai/speech/voice-realtime-config", () => ({
  isAiGatewayConfigured: () => true,
  VOICE_REALTIME_MODEL: "openai/gpt-realtime",
  getAiGatewayTeamIdOrSlug: () => "keinsaas",
}));

vi.mock("lib/ai/speech/voice-gateway.server", () => ({
  getVoiceGateway: () => ({
    experimental_realtime: { getToken: mocks.getToken },
  }),
}));

vi.mock("lib/voice/voice-session", () => ({
  buildVoiceAgentContext: mocks.buildVoiceAgentContext,
}));

import { POST } from "./route";

const TWENTY_ID = "11111111-1111-4111-8111-111111111111";

function mention(name: string): ChatMention {
  return {
    type: "mcpTool",
    serverId: TWENTY_ID,
    serverName: "Twenty",
    name,
    description: name,
  };
}

function tool(name: string): VercelAIMcpTool {
  return {
    description: name,
    inputSchema: jsonSchema({
      type: "object",
      properties: {},
      required: [],
    }),
    execute: async () => ({}),
    _mcpServerName: "Twenty",
    _mcpServerId: TWENTY_ID,
    _originToolName: name,
    _readOnlyHint: true,
  } as VercelAIMcpTool;
}

async function requestSetup() {
  const response = await POST(
    new NextRequest("http://localhost/api/chat/openai-realtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionOnly: true }),
    }),
  );
  expect(response.status).toBe(200);
  return response.json();
}

describe("POST /api/chat/openai-realtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    {
      label: "fully available",
      requested: [mention("findDeals")],
      tools: { findDeals: tool("findDeals") },
      available: 1,
      unavailable: 0,
    },
    {
      label: "partially available",
      requested: [mention("findDeals"), mention("getDeal")],
      tools: { findDeals: tool("findDeals") },
      available: 1,
      unavailable: 1,
    },
    {
      label: "unavailable",
      requested: [mention("findDeals")],
      tools: {},
      available: 0,
      unavailable: 1,
    },
  ])(
    "returns tool status and execution mapping when $label",
    async ({ requested, tools, available, unavailable }) => {
      mocks.buildVoiceAgentContext.mockResolvedValue({
        enabledMentions: requested,
        mcpTools: tools,
        systemPrompt: "Be helpful.",
      });

      const payload = await requestSetup();

      expect(payload.toolStatus.requested).toHaveLength(requested.length);
      expect(payload.toolStatus.available).toHaveLength(available);
      expect(payload.toolStatus.unavailable).toHaveLength(unavailable);
      expect(Object.keys(payload.toolExecutionMap)).toHaveLength(available);
      expect(payload.tools).toHaveLength(available + 2);
      if (available > 0) {
        expect(payload.tools).toContainEqual(
          expect.objectContaining({
            type: "function",
            name: "Twenty_findDeals",
          }),
        );
      }
      expect(mocks.getToken).not.toHaveBeenCalled();
    },
  );
});
