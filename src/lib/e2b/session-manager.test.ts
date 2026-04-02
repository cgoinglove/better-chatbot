import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOrCreateSession,
  refreshSession,
  deleteSession,
} from "./session-manager";

// Mock serverCache
vi.mock("lib/cache", () => ({
  serverCache: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock @e2b/code-interpreter
vi.mock("@e2b/code-interpreter", () => ({
  Sandbox: {
    create: vi.fn().mockResolvedValue({ sandboxId: "sandbox-abc123" }),
    connect: vi.fn().mockResolvedValue({ sandboxId: "sandbox-abc123" }),
  },
}));

import { serverCache } from "lib/cache";
import { Sandbox } from "@e2b/code-interpreter";

describe("getOrCreateSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new sandbox when no session exists", async () => {
    vi.mocked(serverCache.get).mockResolvedValue(undefined);

    const sandboxId = await getOrCreateSession("thread-1");

    expect(Sandbox.create).toHaveBeenCalledWith({
      apiKey: expect.any(String),
    });
    expect(serverCache.set).toHaveBeenCalledWith(
      "e2b:thread-1",
      "sandbox-abc123",
      35 * 60 * 1000,
    );
    expect(sandboxId).toBe("sandbox-abc123");
  });

  it("returns existing sandbox ID when session exists", async () => {
    vi.mocked(serverCache.get).mockResolvedValue("sandbox-existing");

    const sandboxId = await getOrCreateSession("thread-1");

    expect(Sandbox.create).not.toHaveBeenCalled();
    expect(sandboxId).toBe("sandbox-existing");
  });
});

describe("refreshSession", () => {
  it("resets the TTL for an existing session", async () => {
    await refreshSession("thread-1", "sandbox-abc123");

    expect(serverCache.set).toHaveBeenCalledWith(
      "e2b:thread-1",
      "sandbox-abc123",
      35 * 60 * 1000,
    );
  });
});

describe("deleteSession", () => {
  it("removes the session from cache", async () => {
    await deleteSession("thread-1");
    expect(serverCache.delete).toHaveBeenCalledWith("e2b:thread-1");
  });
});
