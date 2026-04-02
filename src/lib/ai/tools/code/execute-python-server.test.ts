import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({ url: "https://blob.example.com/file.pptx" }),
}));

vi.mock("lib/e2b/session-manager", () => ({
  getOrCreateSession: vi.fn().mockResolvedValue("sandbox-abc"),
  refreshSession: vi.fn(),
}));

vi.mock("@e2b/code-interpreter", () => ({
  Sandbox: {
    connect: vi.fn().mockResolvedValue({
      sandboxId: "sandbox-abc",
      runCode: vi.fn().mockResolvedValue({
        results: [],
        logs: { stdout: ["hello world\n"], stderr: [] },
        error: undefined,
      }),
      files: {
        write: vi.fn(),
      },
    }),
  },
}));

import { createExecutePythonTool } from "./execute-python-server";
import { Sandbox } from "@e2b/code-interpreter";
import type { E2BExecutionResult } from "lib/e2b/types";

describe("createExecutePythonTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("E2B_API_KEY", "test-key");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns a tool with execute function", () => {
    const tool = createExecutePythonTool("thread-1");
    expect(tool.execute).toBeDefined();
  });

  it("executes code and returns stdout", async () => {
    const tool = createExecutePythonTool("thread-1");
    const result = (await tool.execute!(
      { code: "print('hello world')" },
      {} as any,
    )) as E2BExecutionResult;

    expect(result.stdout).toBe("hello world\n");
    expect(result.stderr).toBe("");
    expect(result.images).toEqual([]);
    expect(result.sessionId).toBe("sandbox-abc");
  });

  it("uploads file when fileUrl and fileName provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    }) as any;

    const tool = createExecutePythonTool("thread-1");
    await tool.execute!(
      {
        code: "print('hi')",
        fileUrl: "https://example.com/file.xlsx",
        fileName: "file.xlsx",
      },
      {} as any,
    );

    const mockSandbox = await (Sandbox.connect as any).mock.results[0].value;
    expect(mockSandbox.files.write).toHaveBeenCalledWith(
      "/home/user/file.xlsx",
      expect.any(ArrayBuffer),
    );
  });
});
