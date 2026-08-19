import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeVoiceTool } from "./execute-voice-tool";

vi.mock("lib/db/repository", () => ({
  mcpRepository: {
    selectById: vi.fn(),
    selectByServerName: vi.fn(),
    checkAccess: vi.fn(),
  },
}));

vi.mock("lib/ai/mcp/ephemeral-client", () => ({
  createEphemeralMCPClient: vi.fn(),
}));

const { mcpRepository } = await import("lib/db/repository");
const { createEphemeralMCPClient } = await import(
  "lib/ai/mcp/ephemeral-client"
);

describe("executeVoiceTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns browser-only no-op for m5stack default tools", async () => {
    const result = await executeVoiceTool({
      actor: {
        userId: "user-1",
        source: "m5stack",
        deviceId: "device-1",
      },
      toolName: "changeBrowserTheme",
      arguments: { theme: "dark" },
    });

    expect(result.ok).toBe(true);
    expect(result.output).toEqual({
      skipped: true,
      reason: "browser_only",
    });
  });

  it("rejects unknown MCP servers", async () => {
    vi.mocked(mcpRepository.selectByServerName).mockResolvedValue(null);

    const result = await executeVoiceTool({
      actor: {
        userId: "user-1",
        source: "browser",
      },
      toolName: "missing_server_createIssue",
      arguments: {},
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("not_found");
  });

  it("enforces MCP access checks", async () => {
    vi.mocked(mcpRepository.selectByServerName).mockResolvedValue({
      id: "server-1",
      name: "linear",
      enabled: true,
    } as any);
    vi.mocked(mcpRepository.checkAccess).mockResolvedValue(false);

    const result = await executeVoiceTool({
      actor: {
        userId: "user-1",
        source: "browser",
      },
      toolName: "linear_createIssue",
      arguments: {},
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("forbidden");
  });

  it("executes the mapped original tool on the mapped server id", async () => {
    const callTool = vi.fn().mockResolvedValue({ deals: [] });
    const disconnect = vi.fn();
    vi.mocked(mcpRepository.selectById).mockResolvedValue({
      id: "server-1",
      name: "Twenty",
      enabled: true,
    } as any);
    vi.mocked(mcpRepository.checkAccess).mockResolvedValue(true);
    vi.mocked(createEphemeralMCPClient).mockResolvedValue({
      callTool,
      disconnect,
    } as any);

    const result = await executeVoiceTool({
      actor: { userId: "user-1", source: "browser" },
      toolName: "Twenty_find_deals",
      mcpServerId: "server-1",
      mcpToolName: "find deals",
      arguments: { limit: 10 },
    });

    expect(mcpRepository.selectById).toHaveBeenCalledWith("server-1");
    expect(mcpRepository.selectByServerName).not.toHaveBeenCalled();
    expect(callTool).toHaveBeenCalledWith("find deals", { limit: 10 });
    expect(result.ok).toBe(true);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("disconnects ephemeral MCP clients after success and failure", async () => {
    const disconnect = vi.fn();
    vi.mocked(mcpRepository.selectByServerName).mockResolvedValue({
      id: "server-1",
      name: "linear",
      enabled: true,
    } as any);
    vi.mocked(mcpRepository.checkAccess).mockResolvedValue(true);
    vi.mocked(createEphemeralMCPClient).mockResolvedValue({
      callTool: vi.fn().mockResolvedValue({ ok: true }),
      disconnect,
    } as any);

    const success = await executeVoiceTool({
      actor: {
        userId: "user-1",
        source: "browser",
      },
      toolName: "linear_createIssue",
      arguments: { title: "Test" },
    });

    expect(success.ok).toBe(true);
    expect(disconnect).toHaveBeenCalledTimes(1);

    disconnect.mockClear();
    vi.mocked(createEphemeralMCPClient).mockResolvedValue({
      callTool: vi.fn().mockRejectedValue(new Error("boom")),
      disconnect,
    } as any);

    const failure = await executeVoiceTool({
      actor: {
        userId: "user-1",
        source: "browser",
      },
      toolName: "linear_createIssue",
      arguments: { title: "Test" },
    });

    expect(failure.ok).toBe(false);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
