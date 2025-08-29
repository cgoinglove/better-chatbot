import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
import type { AllowedMCPServer, VercelAIMcpTool } from "app-types/mcp";

vi.mock("lib/ai/mcp/mcp-manager", () => ({
  mcpClientsManager: {
    tools: vi.fn(),
  },
}));

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { loadMcpTools } from "./shared.chat";

const tool = (_id: string, serverId: string, name: string): VercelAIMcpTool =>
  ({
    _mcpServerId: serverId,
    _originToolName: name,
  }) as unknown as VercelAIMcpTool;

describe("loadMcpTools", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns empty when no mentions and no allowed servers", async () => {
    vi.mocked(mcpClientsManager.tools).mockResolvedValue({
      "S1:A": tool("1", "S1", "A"),
      "S2:B": tool("2", "S2", "B"),
    });
    const res = await loadMcpTools({ accessibleServerIds: new Set(["S1"]) });
    expect(res).toEqual({});
  });

  it("filters by accessibleServerIds then by mentions", async () => {
    vi.mocked(mcpClientsManager.tools).mockResolvedValue({
      "S1:A": tool("1", "S1", "A"),
      "S2:B": tool("2", "S2", "B"),
    });
    const res = await loadMcpTools({
      accessibleServerIds: new Set(["S1"]),
      mentions: [{ type: "mcpServer", name: "s1", serverId: "S1" } as any],
    });
    expect(Object.keys(res)).toEqual(["S1:A"]);
  });

  it("filters by allowedMcpServers list and accessible ids", async () => {
    vi.mocked(mcpClientsManager.tools).mockResolvedValue({
      "S1:A": tool("1", "S1", "A"),
      "S1:C": tool("3", "S1", "C"),
      "S2:B": tool("2", "S2", "B"),
    });
    const allowed: Record<string, AllowedMCPServer> = {
      S1: { tools: ["A"] },
    };
    const res = await loadMcpTools({
      accessibleServerIds: new Set(["S1", "S2"]),
      allowedMcpServers: allowed,
    });
    expect(Object.keys(res)).toEqual(["S1:A"]);
  });
});
