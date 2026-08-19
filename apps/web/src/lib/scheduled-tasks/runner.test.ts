import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));
// The runner imports these at module load; the executeAgentRun path under test
// does not touch them, so trivial stubs are enough to let the module import.
vi.mock("@/lib/db/pg/db.pg", () => ({ pgDb: {} }));
vi.mock("@/lib/push/send-push-to-user", () => ({
  sendPushToUser: vi.fn(),
}));

import { executeAgentRun, isValidUUID } from "./runner";

const TASK = {
  id: "task-1",
  userId: "11111111-1111-1111-1111-111111111111",
  agentId: "22222222-2222-2222-2222-222222222222",
  inputPrompt: "Check my tasks",
  lastChatThreadId: "33333333-3333-3333-3333-333333333333",
} as any;

const AGENT = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Todoist Agent",
  model: "anthropic/claude-sonnet-5",
  organizationId: null,
} as any;

function streamResponse(status: number) {
  return new Response(
    status === 200
      ? new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("data: ok\n\n"));
            controller.close();
          },
        })
      : "err",
    {
      status,
      headers:
        status === 200 ? { "content-type": "text/event-stream" } : undefined,
    },
  );
}

describe("executeAgentRun", () => {
  beforeEach(() => {
    process.env.SCHEDULED_TASK_SECRET = "secret";
    process.env.NEXT_PUBLIC_BASE_URL = "https://staging.example.com";
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success and reuses the stored thread on 200", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(streamResponse(200));

    const result = await executeAgentRun(TASK, AGENT);

    expect(result).toEqual({
      success: true,
      threadId: "33333333-3333-3333-3333-333333333333",
    });
    // Loopback carries the scheduled-task auth header + the agent's model.
    const [, init] = fetchMock.mock.calls[0]!;
    expect(
      (init!.headers as Record<string, string>)["X-Scheduled-Task-Auth"],
    ).toBe("secret");
    expect(JSON.parse(init!.body as string).chatModel).toEqual({
      provider: "anthropic",
      model: "claude-sonnet-5",
    });
  });

  it("records a permanent failure (4xx) without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(streamResponse(403));

    const result = await executeAgentRun(TASK, AGENT);

    expect(result.success).toBe(false);
    expect(result.error).toContain("403");
  });

  it("throws on a transient failure (5xx) so Inngest retries", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(streamResponse(503));

    await expect(executeAgentRun(TASK, AGENT)).rejects.toThrow(/503/);
  });

  it("records a permanent failure (not success) when the secret is missing", async () => {
    delete process.env.SCHEDULED_TASK_SECRET;
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const result = await executeAgentRun(TASK, AGENT);

    // The whole point of the fix: a missing secret must NOT report success.
    expect(result.success).toBe(false);
    expect(result.error).toContain("SCHEDULED_TASK_SECRET");
    // And it must fail before making the loopback request at all.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a redirect (auth bounce) as failure, never success", async () => {
    // The old code followed redirects to /sign-in (200 HTML) and reported
    // success. redirect:manual surfaces the 3xx; we must reject it.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 307, headers: { location: "/sign-in" } }),
    );

    const result = await executeAgentRun(TASK, AGENT);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/bounce|redirect|SCHEDULED_TASK_SECRET/i);
  });

  it("rejects a non-event-stream body (e.g. an auth HTML page)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>sign in</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const result = await executeAgentRun(TASK, AGENT);

    expect(result.success).toBe(false);
    expect(result.error).toContain("content-type");
  });

  it("passes redirect:manual so fetch does not silently follow the bounce", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(streamResponse(200));

    await executeAgentRun(TASK, AGENT);

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init!.redirect).toBe("manual");
  });
});

describe("isValidUUID", () => {
  it("accepts a v4 uuid and rejects junk", () => {
    expect(isValidUUID("33333333-3333-3333-3333-333333333333")).toBe(true);
    expect(isValidUUID("scheduled-task-abc")).toBe(false);
    expect(isValidUUID(null)).toBe(false);
  });
});
