import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("auth/server", () => ({ getSession: vi.fn() }));
vi.mock("lib/db/repository", () => ({
  mcpRepository: {
    checkAccess: vi.fn(),
    selectById: vi.fn(),
    updateVisibility: vi.fn(),
    deleteById: vi.fn(),
  },
}));

import { getSession } from "auth/server";
import { mcpRepository } from "lib/db/repository";
import { GET, PUT, DELETE } from "./route";

const params = async (id: string) => ({ id });

describe("/api/mcp/[id]", () => {
  beforeEach(() => vi.resetAllMocks());

  it("GET denies unauthorized user", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any);
    const res = await GET(new Request("http://x"), { params: params("a") });
    expect(res.status).toBe(401);
  });

  it("PUT requires ownership (destructive)", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "U" } } as any);
    vi.mocked(mcpRepository.checkAccess).mockResolvedValue(false);
    const res = await PUT(
      new Request("http://x", {
        method: "PUT",
        body: JSON.stringify({ visibility: "public" }),
      }),
      { params: params("S") },
    );
    expect(res.status).toBe(401);
  });

  it("DELETE requires ownership (destructive)", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "U" } } as any);
    vi.mocked(mcpRepository.checkAccess).mockResolvedValue(false);
    const res = await DELETE(new Request("http://x"), { params: params("S") });
    expect(res.status).toBe(401);
  });

  it("GET returns server when access granted", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "U" } } as any);
    vi.mocked(mcpRepository.checkAccess).mockResolvedValue(true as any);
    vi.mocked(mcpRepository.selectById).mockResolvedValue({
      id: "S",
      name: "s",
      config: { command: "x" },
    } as any);
    const res = await GET(new Request("http://x"), { params: params("S") });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "S",
      name: "s",
      config: { command: "x" },
    });
  });

  it("PUT updates visibility when owner", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "U" } } as any);
    vi.mocked(mcpRepository.checkAccess).mockResolvedValue(true as any);
    vi.mocked(mcpRepository.selectById).mockResolvedValue({
      id: "S",
      name: "s",
      config: { command: "x" },
      visibility: "public",
    } as any);
    const res = await PUT(
      new Request("http://x", {
        method: "PUT",
        body: JSON.stringify({ visibility: "public" }),
      }),
      { params: params("S") },
    );
    expect(res.status).toBe(200);
    expect(mcpRepository.updateVisibility).toHaveBeenCalledWith("S", "public");
  });
});
