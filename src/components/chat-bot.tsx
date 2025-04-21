"use client";

import { appStore } from "@/app/store";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import clsx from "clsx";
import { generateUUID } from "lib/utils";
import logger from "logger";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useShallow } from "zustand/shallow";
import { Greeting } from "./greeting";
import { PreviewMessage, ThinkingMessage } from "./message";
import PromptInput from "./prompt-input";

type Props = {
  threadId: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel?: string;
};

export default function ChatBot({ threadId, initialMessages }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [appStoreMutate, model, activeTool] = appStore(
    useShallow((state) => [state.mutate, state.model, state.activeTool]),
  );

  const {
    messages,
    input,
    setInput,
    append,
    status,
    reload,
    setMessages,
    stop,
  } = useChat({
    id: threadId || undefined, // Ensure undefined is passed if threadId is empty string or null
    api: "/api/chat",
    body: { id: threadId || undefined, model, activeTool },
    initialMessages: initialMessages,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    experimental_throttle: 100,
    onFinish: (result) => {
      mutate("threads");
      // Only redirect if we have a valid threadId from the response
      const newThreadId = result?.threadId || threadId;
      if (newThreadId && !threadId) {
        router.push(`/chat/${newThreadId}`);
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

  useEffect(() => {
    if (status === "submitted") {
      containerRef.current?.scrollTo({
        top: containerRef.current?.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [status]);

  return (
    <div className="flex flex-col min-w-0 relative h-full">
      <div className="absolute top-0 left-0 h-12 w-full bg-gradient-to-b from-background to-transparent" />
      {messages.length > 0 ? (
        <>
          <div
            className={"flex flex-col gap-2 overflow-y-auto py-6"}
            ref={containerRef}
          >
            {messages.map((message, index) => (
              <PreviewMessage
                threadId={threadId}
                key={message.id}
                message={message}
                isLoading={isLoading && messages.length - 1 === index}
                setMessages={setMessages}
                reload={reload}
                append={append}
                className={needSpaceClass(index) ? spaceClass : ""}
              />
            ))}
            {status === "submitted" && messages.at(-1)?.role === "user" && (
              <ThinkingMessage className={spaceClass} />
            )}
            <div className="min-w-0 min-h-52" />
          </div>
        </>
      ) : (
        <div className="mt-36">
          <Greeting />
        </div>
      )}
      <div className={clsx(messages.length && "absolute bottom-14", "w-full")}>
        <PromptInput
          threadId={threadId}
          input={input}
          append={append}
          setInput={setInput}
          isLoading={isLoading}
          onStop={stop}
        />
      </div>
    </div>
  );
}
