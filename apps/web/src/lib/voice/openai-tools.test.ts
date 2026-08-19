import type { ChatMention } from "app-types/chat";
import type { VercelAIMcpTool } from "app-types/mcp";
import { describe, expect, it } from "vitest";
import { buildOpenAIRealtimeToolSetup } from "./openai-tools";

const TWENTY_ID = "11111111-1111-4111-8111-111111111111";

function createTool(
  toolName: string,
  overrides: Partial<VercelAIMcpTool> = {},
): VercelAIMcpTool {
  return {
    description: `Twenty ${toolName}`,
    inputSchema: {
      jsonSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
    execute: async () => ({}),
    _mcpServerName: "Twenty CRM",
    _mcpServerId: TWENTY_ID,
    _originToolName: toolName,
    _readOnlyHint: true,
    ...overrides,
  } as VercelAIMcpTool;
}

function toolMention(name: string): ChatMention {
  return {
    type: "mcpTool",
    serverId: TWENTY_ID,
    serverName: "Twenty CRM",
    name,
    description: `Twenty ${name}`,
  };
}

describe("buildOpenAIRealtimeToolSetup", () => {
  it("normalizes names and schemas and creates an execution map", () => {
    const setup = buildOpenAIRealtimeToolSetup({
      mcpTools: { deals: createTool("find deals") },
      requestedMentions: [toolMention("find deals")],
      includeDefaultVoiceTools: false,
    });

    expect(setup.tools).toEqual([
      expect.objectContaining({
        name: "Twenty_CRM_find_deals",
        type: "function",
        parameters: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      }),
    ]);
    expect(setup.toolExecutionMap.Twenty_CRM_find_deals).toEqual({
      mcpServerId: TWENTY_ID,
      mcpServerName: "Twenty CRM",
      toolName: "find deals",
    });
    expect(setup.toolStatus.available).toEqual([
      expect.objectContaining({
        serverId: TWENTY_ID,
        toolName: "find deals",
        exposedName: "Twenty_CRM_find_deals",
      }),
    ]);
    expect(setup.toolStatus.unavailable).toEqual([]);
  });

  it("reports partially and fully unavailable selections", () => {
    const partial = buildOpenAIRealtimeToolSetup({
      mcpTools: { deals: createTool("findDeals") },
      requestedMentions: [toolMention("findDeals"), toolMention("getDeal")],
      includeDefaultVoiceTools: false,
    });
    expect(partial.toolStatus.available).toHaveLength(1);
    expect(partial.toolStatus.unavailable).toEqual([
      expect.objectContaining({ toolName: "getDeal" }),
    ]);

    const unavailable = buildOpenAIRealtimeToolSetup({
      mcpTools: {},
      requestedMentions: [toolMention("findDeals")],
      includeDefaultVoiceTools: false,
    });
    expect(unavailable.toolStatus.available).toEqual([]);
    expect(unavailable.toolStatus.unavailable).toHaveLength(1);
  });

  it("rejects invalid schemas and normalized name collisions", () => {
    expect(() =>
      buildOpenAIRealtimeToolSetup({
        mcpTools: {
          invalid: createTool("findDeals", {
            inputSchema: { jsonSchema: { type: "string" } } as never,
          }),
        },
        includeDefaultVoiceTools: false,
      }),
    ).toThrow("must use an object input schema");

    expect(() =>
      buildOpenAIRealtimeToolSetup({
        mcpTools: {
          first: createTool("find deals"),
          second: createTool("find@deals"),
        },
        includeDefaultVoiceTools: false,
      }),
    ).toThrow('Duplicate realtime tool name "Twenty_CRM_find_deals"');
  });
});
