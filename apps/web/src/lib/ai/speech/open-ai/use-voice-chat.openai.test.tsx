// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const realtimeMock = vi.hoisted(() => {
  const state = {
    status: "disconnected",
    messages: [],
    events: [],
    isCapturing: false,
    isPlaying: false,
  };
  const methods = {
    connect: vi.fn(async () => {
      state.status = "connected";
    }),
    disconnect: vi.fn(() => {
      state.status = "disconnected";
    }),
    addToolOutput: vi.fn(),
    sendEvent: vi.fn(),
    sendTextMessage: vi.fn(),
    sendAudio: vi.fn(),
    commitAudio: vi.fn(),
    clearAudioBuffer: vi.fn(),
    requestResponse: vi.fn(),
    cancelResponse: vi.fn(),
    startAudioCapture: vi.fn(() => {
      state.isCapturing = true;
    }),
    stopAudioCapture: vi.fn(() => {
      state.isCapturing = false;
    }),
    stopPlayback: vi.fn(),
  };

  return {
    state,
    methods,
    latestOptions: null as any,
    setTheme: vi.fn(),
  };
});

vi.mock("@ai-sdk/react", () => ({
  experimental_useRealtime: (options: unknown) => {
    realtimeMock.latestOptions = options;
    // Return a fresh wrapper on every render, matching the SDK behavior that
    // previously caused the app's cleanup effects to disconnect the session.
    return { ...realtimeMock.state, ...realtimeMock.methods };
  },
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: realtimeMock.setTheme }),
}));

import { useOpenAIVoiceChat } from "./use-voice-chat.openai";

function response(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

function createStream() {
  const track = {
    readyState: "live",
    stop: vi.fn(() => {
      track.readyState = "ended";
    }),
  };
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;

  return { stream, track };
}

describe("useOpenAIVoiceChat", () => {
  beforeEach(() => {
    realtimeMock.state.status = "disconnected";
    realtimeMock.state.messages = [];
    realtimeMock.state.events = [];
    realtimeMock.state.isCapturing = false;
    realtimeMock.state.isPlaying = false;
    realtimeMock.latestOptions = null;
    realtimeMock.setTheme.mockReset();
    Object.values(realtimeMock.methods).forEach((method) => method.mockClear());

    const { stream } = createStream();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          instructions: "Be helpful.",
          teamIdOrSlug: "keinsaas",
          tools: [],
          toolStatus: { requested: [], available: [], unavailable: [] },
          toolExecutionMap: {},
        }),
      ),
    );
  });

  it("does not disconnect when playback state causes a rerender", async () => {
    const { result, rerender, unmount } = renderHook(() =>
      useOpenAIVoiceChat({ voice: "ash" }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.start();
    });

    realtimeMock.state.isPlaying = true;
    rerender();
    realtimeMock.state.isPlaying = false;
    rerender();

    expect(realtimeMock.methods.disconnect).not.toHaveBeenCalled();
    expect(realtimeMock.methods.stopAudioCapture).not.toHaveBeenCalled();

    unmount();

    expect(realtimeMock.methods.disconnect).toHaveBeenCalledTimes(1);
    expect(realtimeMock.methods.stopAudioCapture).toHaveBeenCalledTimes(1);
  });

  it("waits for the agent context before opening the realtime connection", async () => {
    let resolveContext: (value: Response) => void;
    const contextPromise = new Promise<Response>((resolve) => {
      resolveContext = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(contextPromise));

    const { result } = renderHook(() => useOpenAIVoiceChat({ voice: "ash" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.start();
    });
    expect(realtimeMock.methods.connect).not.toHaveBeenCalled();

    await act(async () => {
      resolveContext!(response({ instructions: "Be helpful." }));
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.start();
    });
    expect(realtimeMock.methods.connect).toHaveBeenCalledTimes(1);
  });

  it("keeps capture alive while a server tool call is running", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          instructions: "Be helpful.",
          tools: [
            {
              type: "function",
              name: "lookupCustomer",
              description: "Find Twenty deals",
              parameters: {
                type: "object",
                properties: { id: { type: "string" } },
                required: ["id"],
              },
            },
          ],
          toolStatus: {
            requested: [
              {
                serverId: "server-1",
                serverName: "Twenty",
                toolName: "findDeals",
              },
            ],
            available: [
              {
                serverId: "server-1",
                serverName: "Twenty",
                toolName: "findDeals",
                exposedName: "lookupCustomer",
              },
            ],
            unavailable: [],
          },
          toolExecutionMap: {
            lookupCustomer: {
              mcpServerId: "server-1",
              mcpServerName: "Twenty",
              toolName: "findDeals",
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        response({ ok: true, output: { answer: "done" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useOpenAIVoiceChat({ voice: "ash" }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.start();
    });

    expect(realtimeMock.latestOptions.sessionConfig.tools).toEqual([
      expect.objectContaining({ name: "lookupCustomer", type: "function" }),
    ]);

    let toolOutput: unknown;
    await act(async () => {
      toolOutput = await realtimeMock.latestOptions.onToolCall({
        toolCall: {
          toolCallId: "call-1",
          toolName: "lookupCustomer",
          args: { id: "customer-1" },
        },
      });
    });

    expect(toolOutput).toEqual({ answer: "done" });
    expect(realtimeMock.methods.stopAudioCapture).not.toHaveBeenCalled();
    expect(realtimeMock.methods.startAudioCapture).toHaveBeenCalledTimes(1);
    expect(realtimeMock.methods.disconnect).not.toHaveBeenCalled();

    act(() => {
      realtimeMock.latestOptions.onEvent({ type: "speech-started" });
    });
    expect(result.current.isUserSpeaking).toBe(true);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/voice/tool",
      expect.objectContaining({
        body: JSON.stringify({
          toolName: "lookupCustomer",
          mcpServerId: "server-1",
          mcpToolName: "findDeals",
          arguments: { id: "customer-1" },
          callId: "call-1",
        }),
      }),
    );
  });

  it("blocks start when no selected MCP tool is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          instructions: "Be helpful.",
          tools: [],
          toolStatus: {
            requested: [
              {
                serverId: "server-1",
                serverName: "Twenty",
                toolName: "findDeals",
              },
            ],
            available: [],
            unavailable: [
              {
                serverId: "server-1",
                serverName: "Twenty",
                toolName: "findDeals",
              },
            ],
          },
          toolExecutionMap: {},
        }),
      ),
    );

    const { result } = renderHook(() =>
      useOpenAIVoiceChat({
        voice: "ash",
        toolMentions: [
          {
            type: "mcpTool",
            serverId: "server-1",
            serverName: "Twenty",
            name: "findDeals",
            description: "Find deals",
          },
        ],
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toContain(
      "selected MCP tools are currently unavailable",
    );
    await act(async () => {
      await result.current.start();
    });
    expect(realtimeMock.methods.connect).not.toHaveBeenCalled();
  });
});
