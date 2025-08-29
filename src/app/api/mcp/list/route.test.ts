import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("auth/server", () => ({ getSession: vi.fn() }));
vi.mock("lib/db/repository", () => ({
  mcpRepository: {
    selectAll: vi.fn(),
    selectAllByAccess: vi.fn(),
  },
}));
vi.mock("lib/ai/mcp/mcp-manager", () => ({
  mcpClientsManager: {
    getClients: vi.fn(),
    refreshClient: vi.fn(),
    disconnectClient: vi.fn(),
  },
}));

import { getSession } from "auth/server";
import { mcpRepository } from "lib/db/repository";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import { GET } from "./route";

describe("/api/mcp/list", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns only visible servers for user", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "U" } } as any);
    vi.mocked(mcpRepository.selectAll).mockResolvedValue([
      { id: "S1", name: "s1", config: { command: "x" } },
    ] as any);
    vi.mocked(mcpClientsManager.getClients).mockResolvedValue([
      {
        id: "S1",
        client: {
          getInfo: () => ({
            status: "connected",
            toolInfo: [],
            name: "s1",
            config: { command: "x" },
          }),
        },
      },
    ] as any);
    vi.mocked(mcpRepository.selectAllByAccess).mockResolvedValue([
      { id: "S1", name: "s1", config: { command: "x" } },
    ] as any);

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({ id: "S1", name: "s1", status: "connected" }),
    ]);
  });

  it("returns empty list when no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any);
    vi.mocked(mcpRepository.selectAll).mockResolvedValue([] as any);
    vi.mocked(mcpClientsManager.getClients).mockResolvedValue([] as any);
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });
});
