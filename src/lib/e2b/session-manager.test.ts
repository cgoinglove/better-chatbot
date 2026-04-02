import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
  },
}));

import { serverCache } from "lib/cache";
import { Sandbox } from "@e2b/code-interpreter";

describe("getOrCreateSession", () => {
  beforeEach(() => vi.clearAllMocks());

  afterEach(() => vi.unstubAllEnvs());

  it("creates a new sandbox when no session exists", async () => {
    vi.stubEnv("E2B_API_KEY", "test-api-key");
    vi.mocked(serverCache.get).mockResolvedValue(undefined);

    const sandboxId = await getOrCreateSession("thread-1");

    expect(Sandbox.create).toHaveBeenCalledWith({ apiKey: "test-api-key" });
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

  it("throws when E2B_API_KEY is not set", async () => {
    vi.stubEnv("E2B_API_KEY", undefined as unknown as string);
    vi.mocked(serverCache.get).mockResolvedValue(undefined);

    await expect(getOrCreateSession("thread-1")).rejects.toThrow(
      "E2B_API_KEY environment variable is not set",
    );
    expect(Sandbox.create).not.toHaveBeenCalled();
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
