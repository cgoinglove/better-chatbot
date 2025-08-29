import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("auth/server", () => ({ getSession: vi.fn() }));
vi.mock("./actions", () => ({ saveMcpClientAction: vi.fn() }));

import { getSession } from "auth/server";
import { saveMcpClientAction } from "./actions";
import { POST } from "./route";

describe("/api/mcp POST", () => {
  beforeEach(() => vi.resetAllMocks());

  it("requires auth", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any);
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ name: "s", config: { command: "x" } }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("sets default visibility and forwards userId", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: "U" } } as any);
    vi.mocked(saveMcpClientAction).mockResolvedValue(undefined as any);
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ name: "s", config: { command: "x" } }),
      }),
    );
    expect(res.status).toBe(200);
    expect(saveMcpClientAction).toHaveBeenCalledWith({
      name: "s",
      config: { command: "x" },
      userId: "U",
      visibility: "private",
    });
  });
});
