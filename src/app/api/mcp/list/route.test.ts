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

  it("returns only visible servers for user and includes visibility, conditional ownerId", async () => {
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
      {
        id: "S2",
        client: {
          getInfo: () => ({
            status: "connected",
            toolInfo: [],
            name: "s2",
            config: { url: "https://example.com" },
          }),
        },
      },
    ] as any);
    vi.mocked(mcpRepository.selectAllByAccess).mockResolvedValue([
      // Owned item - should NOT include ownerId
      {
        id: "S1",
        name: "s1",
        config: { command: "x" },
        userId: "U",
        visibility: "private",
      },
      // Shared item - should include ownerId
      {
        id: "S2",
        name: "s2",
        config: { url: "https://example.com" },
        userId: "OTHER",
        visibility: "public",
      },
    ] as any);

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    // All items should include visibility
    expect(body.every((i: any) => typeof i.visibility === "string")).toBe(true);
    // Owned item: has visibility, no ownerId
    const owned = body.find((v: any) => v.id === "S1");
    expect(owned).toMatchObject({
      id: "S1",
      name: "s1",
      status: "connected",
      visibility: "private",
    });
    expect(owned.ownerId).toBeUndefined();

    // Shared item: has visibility and ownerId
    const shared = body.find((v: any) => v.id === "S2");
    expect(shared).toMatchObject({
      id: "S2",
      name: "s2",
      visibility: "public",
      ownerId: "OTHER",
    });
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
