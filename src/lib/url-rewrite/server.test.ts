import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatLinkPreset } from "app-types/url-rewrite";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("logger", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const checkAgentAccess = vi.fn();
const checkWorkflowAccess = vi.fn();
const selectAllMcpForUser = vi.fn();

vi.mock("lib/db/repository", () => ({
  agentRepository: {
    checkAccess: (...args: unknown[]) => checkAgentAccess(...args),
  },
  workflowRepository: {
    checkAccess: (...args: unknown[]) => checkWorkflowAccess(...args),
  },
  mcpRepository: {
    selectAllForUser: (...args: unknown[]) => selectAllMcpForUser(...args),
  },
  urlRewriteRepository: { selectBySlug: vi.fn() },
}));

const importServer = async () => await import("./server");

describe("sanitizeChatPresetForUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectAllMcpForUser.mockResolvedValue([{ id: "visible-server" }]);
    checkAgentAccess.mockResolvedValue(true);
    checkWorkflowAccess.mockResolvedValue(true);
  });

  it("keeps references the visitor can use", async () => {
    const { sanitizeChatPresetForUser } = await importServer();
    const preset: ChatLinkPreset = {
      chatModel: { provider: "openai", model: "gpt-4.1" },
      mentions: [
        { type: "agent", name: "Researcher", agentId: "agent-1" },
        { type: "workflow", name: "Flow", workflowId: "workflow-1" },
        { type: "mcpServer", name: "Search", serverId: "visible-server" },
        { type: "defaultTool", name: "webSearch", label: "Web search" },
      ],
      allowedMcpServers: { "visible-server": { tools: ["search"] } },
    };

    const result = await sanitizeChatPresetForUser(preset, "user-1");

    expect(result.mentions).toHaveLength(4);
    expect(result.allowedMcpServers).toEqual({
      "visible-server": { tools: ["search"] },
    });
    expect(result.chatModel).toEqual(preset.chatModel);
  });

  it("drops agents, workflows and mcp servers the visitor cannot access", async () => {
    checkAgentAccess.mockResolvedValue(false);
    checkWorkflowAccess.mockResolvedValue(false);

    const { sanitizeChatPresetForUser } = await importServer();
    const result = await sanitizeChatPresetForUser(
      {
        mentions: [
          { type: "agent", name: "Private", agentId: "agent-1" },
          { type: "workflow", name: "Private", workflowId: "workflow-1" },
          { type: "mcpServer", name: "Private", serverId: "hidden-server" },
          { type: "defaultTool", name: "webSearch", label: "Web search" },
        ],
        allowedMcpServers: { "hidden-server": { tools: ["search"] } },
      },
      "user-1",
    );

    expect(result.mentions).toEqual([
      { type: "defaultTool", name: "webSearch", label: "Web search" },
    ]);
    // An override that filters down to nothing stays an override.
    expect(result.allowedMcpServers).toEqual({});
  });

  it("leaves keys the link does not override untouched", async () => {
    const { sanitizeChatPresetForUser } = await importServer();

    const result = await sanitizeChatPresetForUser(
      { chatModel: { provider: "openai", model: "gpt-4.1" } },
      "user-1",
    );

    expect(result.mentions).toBeUndefined();
    expect(result.allowedMcpServers).toBeUndefined();
    expect(result.allowedAppDefaultToolkit).toBeUndefined();
  });

  it("drops a mention rather than failing the link when an access check throws", async () => {
    checkAgentAccess.mockRejectedValue(new Error("db down"));

    const { sanitizeChatPresetForUser } = await importServer();
    const result = await sanitizeChatPresetForUser(
      {
        mentions: [{ type: "agent", name: "Researcher", agentId: "agent-1" }],
        message: { text: "Hello", mode: "send" },
      },
      "user-1",
    );

    expect(result.mentions).toEqual([]);
    expect(result.message).toEqual({ text: "Hello", mode: "send" });
  });
});
