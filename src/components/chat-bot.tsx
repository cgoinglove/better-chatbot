"use client";

import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PromptInput from "./prompt-input";
import clsx from "clsx";
import { appStore } from "@/app/store";
import { cn, generateUUID } from "lib/utils";
import { PreviewMessage } from "./message";
import { Greeting } from "./greeting";
import logger from "logger";
import { useShallow } from "zustand/shallow";
import { UIMessage } from "ai";

import { safe } from "ts-safe";
import { mutate } from "swr";

type Props = {
  threadId: string;
  projectId?: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel?: string;
  action?: string;
  slots?: {
    emptySlot?: ReactNode;
    inputBottomSlot?: ReactNode;
  };
};

export default function ChatBot({
  threadId,
  projectId,
  initialMessages,
  action,
  slots,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [appStoreMutate, model, toolChoice] = appStore(
    useShallow((state) => [state.mutate, state.model, state.toolChoice]),
  );

  const {
    messages,
    input,
    setInput,
    append,
    status,
    reload,
    setMessages,
    addToolResult,
    stop,
  } = useChat({
    id: threadId,
    api: "/api/chat",
    body: { id: threadId, model, toolChoice, projectId, action },
    initialMessages: initialMessages,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    experimental_throttle: 100,
    onFinish() {
      const chatPath = `/chat/${threadId}`;
      if (window.location.pathname !== chatPath && action != "temporary-chat") {
        window.history.replaceState({}, "", chatPath);
        mutate("threads");
      }
    },
    onError: (error) => {
      logger.error(error);
      toast.error(error.message || "An error occured, please try again!");
    },
  });

  const isLoading = useMemo(
    () => status === "streaming" || status === "submitted",
    [status],
  );

  const emptyMessage = useMemo(() => messages.length === 0, [messages.length]);

  const isInitialThreadEntry = useMemo(
    () =>
      initialMessages.length > 0 &&
      initialMessages.at(-1)?.id === messages.at(-1)?.id,
    [initialMessages, messages],
  );

  const spaceClass = "min-h-[55dvh]";

  const needSpaceClass = useCallback(
    (index: number) => {
      if (isInitialThreadEntry || index != messages.length - 1) return false;
      const message = messages[index];
      if (message.role === "user") return false;
      return true;
    },
    [messages],
  );

  const [isExecutingProxyToolCall, setIsExecutingProxyToolCall] =
    useState(false);

  const isPendingToolCall = useMemo(() => {
    if (status != "ready" || toolChoice != "manual") return;
    const lastMessage = messages.at(-1);
    if (lastMessage?.role != "assistant") return;
    const lastPart = lastMessage.parts.at(-1);
    if (lastPart?.type != "tool-invocation") return;
    if (lastPart.toolInvocation.state != "call") return;
    return true;
  }, [status, toolChoice, messages]);

  const proxyToolCall = useCallback(
    (answer: boolean) => {
      if (!isPendingToolCall) throw new Error("Tool call is not supported");
      setIsExecutingProxyToolCall(true);
      return safe(async () => {
        const lastMessage = messages.at(-1)!;
        const lastPart = lastMessage.parts.at(-1)! as Extract<
          UIMessage["parts"][number],
          { type: "tool-invocation" }
        >;
        return addToolResult({
          toolCallId: lastPart.toolInvocation.toolCallId,
          result: answer,
        });
      })
        .watch(() => setIsExecutingProxyToolCall(false))
        .unwrap();
    },
    [isPendingToolCall, addToolResult],
  );

  useEffect(() => {
    appStoreMutate({ currentThreadId: threadId });
    return () => {
      appStoreMutate({ currentThreadId: null });
    };
  }, [threadId]);

  useEffect(() => {
    if (isInitialThreadEntry)
      containerRef.current?.scrollTo({
        top: containerRef.current?.scrollHeight,
        behavior: "instant",
      });
  }, [isInitialThreadEntry]);

  return (
    <div
      className={cn(
        emptyMessage && "justify-center pb-24",
        "flex flex-col min-w-0 relative h-full",
      )}
    >
      {emptyMessage ? (
        slots?.emptySlot ? (
          slots.emptySlot
        ) : (
          <Greeting />
        )
      ) : (
        <>
          <div
            className={"flex flex-col gap-2 overflow-y-auto py-6"}
            ref={containerRef}
          >
            {messages.map((message, index) => {
              const isLastMessage = messages.length - 1 === index;
              return (
                <PreviewMessage
                  threadId={threadId}
                  messageIndex={index}
                  key={index}
                  message={message}
                  status={status}
                  onPoxyToolCall={
                    isLastMessage &&
                    isPendingToolCall &&
                    !isExecutingProxyToolCall
                      ? proxyToolCall
                      : undefined
                  }
                  isLoading={isLoading || isExecutingProxyToolCall}
                  isLastMessage={isLastMessage}
                  setMessages={setMessages}
                  reload={reload}
                  className={needSpaceClass(index) ? spaceClass : ""}
                />
              );
            })}
            {status === "submitted" && messages.at(-1)?.role === "user" && (
              <div className={spaceClass} />
            )}
            <div className="min-w-0 min-h-52" />
          </div>
        </>
      )}
      <div className={clsx(messages.length && "absolute bottom-14", "w-full")}>
        <PromptInput
          input={input}
          append={append}
          ownerId={threadId}
          ownerType="thread"
          isTemporaryChat={action == "temporary-chat"}
          setInput={setInput}
          isLoading={isLoading}
          onStop={stop}
        />
        {slots?.inputBottomSlot}
      </div>
    </div>
  );
}
