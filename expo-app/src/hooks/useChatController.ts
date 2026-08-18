import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteMessage,
  generateThreadTitle,
  getThread,
  regenerateFromMessage,
  startChatRequest,
} from "@/lib/api";
import { createId, createTextMessage, getMessageText } from "@/lib/messages";
import { readUiMessageStream } from "@/lib/stream";
import type {
  ChatAttachment,
  ChatModel,
  ToolChoice,
  UIMessage,
} from "@/lib/types";
import { useChatStore } from "@/store/chat-store";

type ControllerOptions = {
  threadId: string;
  temporary?: boolean;
  initialMessages?: UIMessage[];
  temporaryInstructions?: string;
  chatModel?: ChatModel;
  toolChoice: ToolChoice;
};

export function useChatController({
  threadId,
  temporary,
  initialMessages,
  temporaryInstructions,
  chatModel,
  toolChoice,
}: ControllerOptions) {
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages || []);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { draftAttachments, imageTool, clearDraftAttachments } = useChatStore();

  const threadQuery = useQuery({
    enabled: !temporary,
    queryKey: ["thread", threadId],
    queryFn: () => getThread(threadId),
  });

  useEffect(() => {
    if (!temporary && threadQuery.data?.messages) {
      setMessages(threadQuery.data.messages);
    }
  }, [temporary, threadQuery.data]);

  useEffect(() => {
    if (temporary) {
      setMessages(initialMessages || []);
    }
  }, [initialMessages, temporary, threadId]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(
    async (text: string, attachments?: ChatAttachment[]) => {
      const userMessage = createTextMessage("user", text);
      const assistantSeed: UIMessage = {
        id: createId("assistant"),
        role: "assistant",
        parts: [],
      };
      const currentAttachments = attachments ?? draftAttachments;
      const controller = new AbortController();

      abortRef.current = controller;
      setError(null);
      setStreaming(true);
      setMessages((current) => [...current, userMessage, assistantSeed]);
      clearDraftAttachments();

      try {
        const response = await startChatRequest(
          temporary ? "/api/chat/temporary" : "/api/chat",
          {
            id: threadId,
            message: userMessage,
            messages: temporary
              ? [
                  ...messages.filter(
                    (message) =>
                      message.role === "user" || message.role === "assistant",
                  ),
                  userMessage,
                ]
              : undefined,
            chatModel,
            toolChoice,
            attachments: currentAttachments,
            instructions: temporaryInstructions,
            imageTool: temporary ? "off" : imageTool,
          },
          controller.signal,
        );

        if (!response.ok) {
          const body = await response.text();
          throw new Error(body || `Chat failed with ${response.status}`);
        }

        await readUiMessageStream(response, assistantSeed, (updated) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantSeed.id || message.id === updated.id
                ? updated
                : message,
            ),
          );
        });

        if (!temporary) {
          await queryClient.invalidateQueries({ queryKey: ["threads"] });
          await queryClient.invalidateQueries({
            queryKey: ["thread", threadId],
          });
          if (messages.length === 0) {
            await generateThreadTitle(threadId, text, chatModel);
            await queryClient.invalidateQueries({ queryKey: ["threads"] });
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Message failed");
        }
      } finally {
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [
      chatModel,
      clearDraftAttachments,
      draftAttachments,
      imageTool,
      messages.length,
      messages,
      queryClient,
      temporary,
      temporaryInstructions,
      threadId,
      toolChoice,
    ],
  );

  const removeMessage = useCallback(
    async (message: UIMessage) => {
      if (temporary) {
        setMessages((current) =>
          current.filter((item) => item.id !== message.id),
        );
        return;
      }

      await deleteMessage(message.id);
      setMessages((current) =>
        current.filter((item) => item.id !== message.id),
      );
      await queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    [queryClient, temporary, threadId],
  );

  const retryFrom = useCallback(
    async (message: UIMessage) => {
      const index = messages.findIndex((item) => item.id === message.id);
      const previousUser = [...messages]
        .slice(0, Math.max(index, 0))
        .reverse()
        .find((item) => item.role === "user");

      if (!previousUser) {
        return;
      }

      if (!temporary) {
        await regenerateFromMessage(previousUser.id);
      }

      setMessages((current) => {
        const previousIndex = current.findIndex(
          (item) => item.id === previousUser.id,
        );
        return previousIndex >= 0 ? current.slice(0, previousIndex) : current;
      });
      await send(getMessageText(previousUser), []);
    },
    [messages, send, temporary],
  );

  return {
    messages,
    loading: threadQuery.isLoading,
    error,
    streaming,
    send,
    stop,
    removeMessage,
    retryFrom,
  };
}
