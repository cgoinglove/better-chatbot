"use client";

import { appStore } from "@/app/store";
import { experimental_useRealtime } from "@ai-sdk/react";
import type { Experimental_RealtimeServerEvent } from "ai";
import { isToolUIPart } from "ai";
import { generateUUID } from "lib/utils";
import {
  OpenAIRealtimeFunctionTool,
  isDefaultVoiceTool,
} from "lib/voice/openai-tools";
import {
  VoiceToolExecutionMap,
  VoiceToolStatus,
  createEmptyVoiceToolStatus,
} from "lib/voice/types";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UIMessageWithCompleted, VoiceChatOptions, VoiceChatSession } from "..";
import { OPENAI_VOICE } from "./voice-constants";
import {
  createBrowserGatewayRealtimeModel,
  setBrowserGatewayTeamIdOrSlug,
} from "./voice-gateway-client";
import { buildVoiceTokenApiUrl } from "./voice-token-api";

function extractUsageFromRealtimeEvent(
  event: Experimental_RealtimeServerEvent,
): {
  responseId: string;
  promptTokens: number;
  completionTokens: number;
} | null {
  const raw = event as Record<string, unknown>;
  const type = raw.type;
  if (type !== "response-done" && type !== "response.done") {
    return null;
  }

  const response =
    typeof raw.response === "object" && raw.response !== null
      ? (raw.response as Record<string, unknown>)
      : undefined;

  const usage =
    typeof raw.usage === "object" && raw.usage !== null
      ? (raw.usage as Record<string, unknown>)
      : typeof response?.usage === "object" && response.usage !== null
        ? (response.usage as Record<string, unknown>)
        : null;

  if (!usage) {
    return null;
  }

  const promptTokens = Number(
    usage.inputTokens ?? usage.input_tokens ?? usage.prompt_tokens ?? 0,
  );
  const completionTokens = Number(
    usage.outputTokens ?? usage.output_tokens ?? usage.completion_tokens ?? 0,
  );

  if (promptTokens <= 0 && completionTokens <= 0) {
    return null;
  }

  const responseId = String(
    raw.responseId ??
      raw.response_id ??
      response?.id ??
      `response-${Date.now()}`,
  );

  return { responseId, promptTokens, completionTokens };
}

function trackVoiceRealtimeUsage({
  sessionId,
  responseId,
  promptTokens,
  completionTokens,
}: {
  sessionId: string;
  responseId: string;
  promptTokens: number;
  completionTokens: number;
}) {
  void fetch("/api/voice/realtime/track-usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      responseId,
      promptTokens,
      completionTokens,
    }),
  }).catch((error) => {
    console.error("[voice-realtime] Failed to track usage:", error);
  });
}

function isMessageCompleted(message: UIMessageWithCompleted): boolean {
  if (!message.parts.length) {
    return false;
  }

  return message.parts.every((part) => {
    if (part.type === "text") {
      return part.state === "done" || Boolean(part.text?.trim());
    }
    if (isToolUIPart(part)) {
      return (
        part.state === "output-available" ||
        part.state === "output-error" ||
        part.state === "output-denied"
      );
    }
    return true;
  });
}

export function useOpenAIVoiceChat(props?: VoiceChatOptions): VoiceChatSession {
  const { voice = OPENAI_VOICE.Ash } = props || {};

  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [contextError, setContextError] = useState<Error | null>(null);
  const [preparedContext, setPreparedContext] = useState<{
    key: string;
    voice: string;
    agentId?: string;
    toolMentions: NonNullable<VoiceChatOptions["toolMentions"]>;
    instructions?: string;
    tools: OpenAIRealtimeFunctionTool[];
    toolStatus: VoiceToolStatus;
    toolExecutionMap: VoiceToolExecutionMap;
  } | null>(null);

  const { setTheme } = useTheme();
  const audioStreamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef(generateUUID());
  const trackedResponsesRef = useRef(new Set<string>());
  const stopRef = useRef<(() => Promise<void>) | null>(null);
  const hasStoppedRef = useRef(false);
  const isStoppingRef = useRef(false);
  const expectedDisconnectRef = useRef(false);
  const previousStatusRef = useRef<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const realtimeRef = useRef<ReturnType<
    typeof experimental_useRealtime
  > | null>(null);
  const toolExecutionMapRef = useRef<VoiceToolExecutionMap>({});

  /**
   * Docs use `gateway.experimental_realtime(modelId)` from `@ai-sdk/gateway`.
   * canary.107 throws in browsers ("cannot be used in browsers yet"), so this
   * object mirrors GatewayRealtimeModel (getWebSocketConfig / parse / serialize).
   */
  const realtimeModel = useMemo(() => createBrowserGatewayRealtimeModel(), []);

  const toolMentions = props?.toolMentions ?? [];
  const agentId = props?.agentId;
  const requestedContextKey = useMemo(
    () => JSON.stringify({ voice, agentId, toolMentions }),
    [voice, agentId, toolMentions],
  );
  const requestedContext = useMemo(
    () => ({
      key: requestedContextKey,
      voice,
      agentId,
      toolMentions,
    }),
    [requestedContextKey],
  );

  const sessionConfig = useMemo(
    () => ({
      voice: preparedContext?.voice ?? voice,
      inputAudioTranscription: {},
      turnDetection: { type: "server-vad" as const },
      ...(preparedContext?.instructions
        ? { instructions: preparedContext.instructions }
        : {}),
      ...(preparedContext ? { tools: preparedContext.tools } : {}),
    }),
    [voice, preparedContext],
  );

  const realtimeApi = useMemo(
    () => ({
      token: buildVoiceTokenApiUrl(
        preparedContext?.agentId,
        preparedContext?.toolMentions,
      ),
    }),
    [preparedContext],
  );

  const handleUsageEvent = useCallback(
    (event: Experimental_RealtimeServerEvent) => {
      const usage = extractUsageFromRealtimeEvent(event);
      if (!usage) {
        return;
      }
      if (trackedResponsesRef.current.has(usage.responseId)) {
        return;
      }
      trackedResponsesRef.current.add(usage.responseId);
      trackVoiceRealtimeUsage({
        sessionId: sessionIdRef.current,
        ...usage,
      });
    },
    [],
  );

  const onEvent = useCallback(
    (event: Experimental_RealtimeServerEvent) => {
      if (event.type === "speech-started") {
        setIsUserSpeaking(true);
      }
      if (event.type === "speech-stopped") {
        setIsUserSpeaking(false);
      }
      handleUsageEvent(event);
    },
    [handleUsageEvent],
  );

  const onError = useCallback((nextError: Error) => {
    console.error("[voice-realtime] session error", {
      name: nextError.name,
      message: nextError.message,
    });
    if (!expectedDisconnectRef.current) {
      setError(nextError);
    }
    setIsLoading(false);
  }, []);

  const onToolCall = useCallback(
    async ({
      toolCall,
    }: {
      toolCall: { toolCallId: string; toolName: string; args: unknown };
    }) => {
      const { toolCallId, toolName, args } = toolCall;

      if (isDefaultVoiceTool(toolName)) {
        if (toolName === "changeBrowserTheme") {
          const theme = (args as { theme?: string })?.theme;
          if (theme === "light" || theme === "dark") {
            setTheme(theme);
          }
          return "success";
        }

        if (toolName === "endConversation") {
          await stopRef.current?.();
          setError(null);
          appStore.setState((prev) => ({
            voiceChat: {
              ...prev.voiceChat,
              agentId: undefined,
              isOpen: false,
            },
          }));
          return "success";
        }

        return "success";
      }

      const executionTarget = toolExecutionMapRef.current[toolName];
      if (!executionTarget) {
        throw new Error(
          `Tool "${toolName}" is not available in this voice session`,
        );
      }

      try {
        const response = await fetch("/api/voice/tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toolName,
            mcpServerId: executionTarget.mcpServerId,
            mcpToolName: executionTarget.toolName,
            arguments: args,
            callId: toolCallId,
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error?.message || payload.error || "Tool failed",
          );
        }

        return payload.output;
      } catch (toolError) {
        throw toolError;
      }
    },
    [setTheme],
  );

  const realtime = experimental_useRealtime({
    model: realtimeModel as Parameters<
      typeof experimental_useRealtime
    >[0]["model"],
    api: realtimeApi,
    sessionConfig,
    onEvent,
    onError,
    onToolCall: onToolCall as Parameters<
      typeof experimental_useRealtime
    >[0]["onToolCall"],
  });

  realtimeRef.current = realtime;
  toolExecutionMapRef.current = preparedContext?.toolExecutionMap ?? {};

  // Prepare the agent/MCP context before connecting. A sessionConfig identity
  // change makes useRealtime dispose its current store, so a live session is
  // deliberately frozen until it is explicitly stopped.
  useEffect(() => {
    let cancelled = false;

    if (realtime.status !== "disconnected") {
      return;
    }

    if (preparedContext?.key === requestedContext.key) {
      setIsContextLoading(false);
      return;
    }

    setIsContextLoading(true);
    setContextError(null);
    setBrowserGatewayTeamIdOrSlug(undefined);

    const tokenUrl = buildVoiceTokenApiUrl(
      requestedContext.agentId,
      requestedContext.toolMentions,
    );

    void (async () => {
      try {
        const response = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionConfig: { voice: requestedContext.voice },
            sessionOnly: true,
            agentId: requestedContext.agentId,
            mentions: requestedContext.toolMentions,
          }),
        });
        if (!response.ok) {
          throw new Error(
            `Failed to prepare voice session: ${response.status}`,
          );
        }
        if (cancelled) {
          return;
        }
        const payload = (await response.json()) as {
          instructions?: string;
          teamIdOrSlug?: string;
          tools?: OpenAIRealtimeFunctionTool[];
          toolStatus?: VoiceToolStatus;
          toolExecutionMap?: VoiceToolExecutionMap;
        };
        if (cancelled) {
          return;
        }
        const toolStatus = payload.toolStatus ?? createEmptyVoiceToolStatus();
        setPreparedContext({
          ...requestedContext,
          instructions: payload.instructions,
          tools: payload.tools ?? [],
          toolStatus,
          toolExecutionMap: payload.toolExecutionMap ?? {},
        });
        setBrowserGatewayTeamIdOrSlug(payload.teamIdOrSlug);
        if (
          toolStatus.requested.length > 0 &&
          toolStatus.available.length === 0
        ) {
          setContextError(
            new Error(
              "The selected MCP tools are currently unavailable. Reconnect the MCP server and try again.",
            ),
          );
        }
        setIsContextLoading(false);
      } catch (nextError) {
        if (cancelled) {
          return;
        }
        setContextError(
          nextError instanceof Error
            ? nextError
            : new Error("Failed to prepare voice session"),
        );
        setIsContextLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestedContext, preparedContext?.key, realtime.status]);

  const isActive = realtime.status === "connected";
  const isListening = realtime.isCapturing;
  const isAssistantSpeaking = realtime.isPlaying;
  const isReadyToConnect =
    preparedContext != null && !isContextLoading && contextError == null;
  const sessionError = contextError ?? error;
  const toolStatus =
    preparedContext?.toolStatus ?? createEmptyVoiceToolStatus();
  const toolWarning =
    toolStatus.available.length > 0 && toolStatus.unavailable.length > 0
      ? `${toolStatus.unavailable.length} selected MCP tool${toolStatus.unavailable.length === 1 ? " is" : "s are"} unavailable. The conversation will use the remaining tools.`
      : null;

  const messages = useMemo<UIMessageWithCompleted[]>(() => {
    return realtime.messages.map((message) => ({
      ...message,
      completed: isMessageCompleted(message as UIMessageWithCompleted),
    }));
  }, [realtime.messages]);

  const stop = useCallback(async () => {
    if (isStoppingRef.current || hasStoppedRef.current) {
      return;
    }

    isStoppingRef.current = true;
    expectedDisconnectRef.current = true;
    try {
      realtimeRef.current?.stopAudioCapture();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      realtimeRef.current?.disconnect();
      setIsUserSpeaking(false);
      setIsLoading(false);
      hasStoppedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      isStoppingRef.current = false;
    }
  }, []);

  stopRef.current = stop;

  /** Docs flow: connect() → getUserMedia → startAudioCapture(stream) */
  const start = useCallback(async () => {
    const currentRealtime = realtimeRef.current;
    if (
      currentRealtime == null ||
      currentRealtime.status !== "disconnected" ||
      isLoading ||
      !isReadyToConnect
    ) {
      return;
    }

    hasStoppedRef.current = false;
    setIsLoading(true);
    setError(null);
    trackedResponsesRef.current.clear();
    sessionIdRef.current = generateUUID();

    try {
      await currentRealtime.connect();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      currentRealtime.startAudioCapture(stream);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
      await stop();
    }
  }, [isLoading, isReadyToConnect, stop]);

  const startListening = useCallback(async () => {
    try {
      const streamHasEnded = audioStreamRef.current
        ?.getAudioTracks()
        .every((track) => track.readyState === "ended");
      if (!audioStreamRef.current || streamHasEnded) {
        audioStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }
      if (realtimeRef.current?.status === "connected") {
        realtimeRef.current.startAudioCapture(audioStreamRef.current);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      realtimeRef.current?.stopAudioCapture();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  useEffect(() => {
    if (realtime.status === "connecting") {
      setIsLoading(true);
    } else if (realtime.status === "connected" || realtime.status === "error") {
      setIsLoading(false);
    }
  }, [realtime.status]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    if (
      previousStatus === "connected" &&
      realtime.status === "disconnected" &&
      !expectedDisconnectRef.current
    ) {
      const disconnectError = new Error(
        "Voice connection closed unexpectedly. Please start the conversation again.",
      );
      console.error("[voice-realtime] unexpected disconnect", {
        previousStatus,
        status: realtime.status,
      });
      setError(disconnectError);
    }
    previousStatusRef.current = realtime.status;
    if (realtime.status === "disconnected") {
      expectedDisconnectRef.current = false;
    }
  }, [realtime.status]);

  useEffect(() => {
    return () => {
      void stopRef.current?.();
    };
  }, []);

  return {
    isActive,
    isUserSpeaking,
    isAssistantSpeaking,
    isListening,
    isLoading: isLoading || isContextLoading,
    error: sessionError,
    toolStatus,
    toolWarning,
    messages,
    start,
    stop,
    startListening,
    stopListening,
  };
}
