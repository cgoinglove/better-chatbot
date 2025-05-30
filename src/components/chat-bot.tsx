"use client";

import { appStore } from "@/app/store";
import { useArtifactSelector } from "@/hooks/use-artifact";
import type { Vote } from "@/lib/db/schema";
import { useChat } from "@ai-sdk/react";
import type { Attachment } from "ai";
import { cn, fetcher, generateUUID, truncateString } from "lib/utils";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Artifact } from "./artifact";
import { ErrorMessage, PreviewMessage } from "./message";
import { DataStreamHandler } from "./data-stream-handler";
import { Greeting } from "./greeting";
import { MultimodalInput } from "./multimodal-input";
import { UIMessage } from "ai";
import { useShallow } from "zustand/shallow";
import { deleteThreadAction } from "@/app/api/chat/actions";
import { useLatest } from "@/hooks/use-latest";
import {
  ChatApiSchemaRequestBody,
  ChatMessageAnnotation,
} from "app-types/chat";
import { Shortcuts, isShortcutEvent } from "lib/keyboard-shortcuts";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { safe } from "ts-safe";
import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";

interface Props {
  threadId: string;
  initialMessages: Array<UIMessage>;
  selectedModel: string;
  selectedToolChoice: "auto" | "none" | "manual";
  slots?: {
    emptySlot?: React.ReactNode;
  };
  isReadonly?: boolean;
}

export default function ChatBot({
  threadId,
  initialMessages,
  selectedModel,
  selectedToolChoice,
  slots,
  isReadonly = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [
    appStoreMutate,
    allowedAppDefaultToolkit,
    allowedMcpServers,
    threadList,
  ] = appStore(
    useShallow((state) => [
      state.mutate,
      state.allowedAppDefaultToolkit,
      state.allowedMcpServers,
      state.threadList,
    ]),
  );

  // Temporary mapping until we reconcile the two model systems
  const modelMap: Record<string, string> = {
    "chat-model-small": "4o-mini",
    "chat-model-large": "4o",
    "chat-model-reasoning": "gpt-4.1",
  };

  const actualModel = modelMap[selectedModel] || selectedModel;

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  const latestRef = useLatest({
    toolChoice: selectedToolChoice,
    model: actualModel,
    allowedAppDefaultToolkit,
    allowedMcpServers,
    messages: initialMessages,
    threadId,
  });

  const {
    messages,
    input,
    setInput,
    append,
    status,
    reload,
    setMessages,
    addToolResult,
    error,
    stop,
  } = useChat({
    id: threadId,
    api: "/api/chat",
    initialMessages,
    experimental_prepareRequestBody: ({ messages }) => {
      window.history.replaceState({}, "", `/chat/${threadId}`);
      const lastMessage = messages.at(-1)!;
      vercelAISdkV4ToolInvocationIssueCatcher(lastMessage);
      const request: ChatApiSchemaRequestBody = {
        id: threadId,
        model: selectedModel,
        toolChoice: selectedToolChoice,
        message: lastMessage,
      };
      return request;
    },
    sendExtraMessageFields: true,
    generateId: generateUUID,
    experimental_throttle: 100,
    onFinish() {
      if (threadList[0].id !== threadId) {
        mutate("threads");
      }
    },
    onError: (error) => {
      toast.error(
        truncateString(error.message, 100) ||
          "An error occured, please try again!",
      );
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${threadId}` : null,
    fetcher,
  );

  const [isDeleteThreadPopupOpen, setIsDeleteThreadPopupOpen] = useState(false);

  const isLoading = useMemo(
    () => status === "streaming" || status === "submitted",
    [status],
  );

  const emptyMessage = useMemo(
    () => messages.length === 0 && !error,
    [messages.length, error],
  );

  const handleFormSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (isLoading) {
        stop();
        return;
      }
      if (input.trim()) {
        await append({
          id: generateUUID(),
          role: "user",
          content: "",
          parts: [{ type: "text", text: input }],
        });
        setInput("");
      }
    },
    [append, input, isLoading, stop, setInput],
  );

  const isInitialThreadEntry = useMemo(
    () =>
      initialMessages.length > 0 &&
      initialMessages.at(-1)?.id === messages.at(-1)?.id,
    [initialMessages, messages],
  );

  const needSpaceClass = useCallback(
    (index: number) => {
      if (error || isInitialThreadEntry || index != messages.length - 1)
        return false;
      const message = messages[index];
      if (message.role === "user") return false;
      return true;
    },
    [messages, error],
  );

  const [isExecutingProxyToolCall, setIsExecutingProxyToolCall] =
    useState(false);

  const isPendingToolCall = useMemo(() => {
    if (status != "ready") return false;
    const lastMessage = messages.at(-1);
    if (lastMessage?.role != "assistant") return false;
    const annotation = lastMessage.annotations?.at(-1) as ChatMessageAnnotation;
    if (annotation?.toolChoice != "manual") return false;
    const lastPart = lastMessage.parts.at(-1);
    if (!lastPart) return false;
    if (lastPart.type != "tool-invocation") return false;
    if (lastPart.toolInvocation.state != "call") return false;
    return true;
  }, [status, messages]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const messages = latestRef.current.messages;
      if (messages.length === 0) return;
      const isLastMessageCopy = isShortcutEvent(e, Shortcuts.lastMessageCopy);
      const isDeleteThread = isShortcutEvent(e, Shortcuts.deleteThread);
      if (!isDeleteThread && !isLastMessageCopy) return;
      e.preventDefault();
      e.stopPropagation();
      if (isLastMessageCopy) {
        const lastMessage = messages.at(-1);
        const lastMessageText = lastMessage!.parts
          .filter((part) => part.type == "text")
          ?.at(-1)?.text;
        if (!lastMessageText) return;
        navigator.clipboard.writeText(lastMessageText);
        toast.success("Last message copied to clipboard");
      }
      if (isDeleteThread) {
        setIsDeleteThreadPopupOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={cn(
        emptyMessage && "justify-center pb-24",
        "flex flex-col min-w-0 relative h-full",
      )}
    >
      <div className="flex-1 overflow-y-auto">
        {emptyMessage ? (
          slots?.emptySlot ? (
            slots.emptySlot
          ) : (
            <Greeting />
          )
        ) : (
          <div className="flex flex-col gap-2 py-6">
            <DataStreamHandler id={threadId} />
            {error && <ErrorMessage error={error} />}
            {messages.map((m, i) => (
              <PreviewMessage
                key={m.id}
                message={m}
                threadId={threadId}
                messageIndex={i}
                status={status}
                onProxyToolCall={
                  i === messages.length - 1 &&
                  isPendingToolCall &&
                  !isExecutingProxyToolCall
                    ? proxyToolCall
                    : undefined
                }
                isLoading={isLoading || isPendingToolCall}
                isError={!!error && i === messages.length - 1}
                isLastMessage={i === messages.length - 1}
                setMessages={setMessages}
                reload={reload}
                vote={votes?.find((v) => v.messageId === m.id)}
                isReadonly={isReadonly}
                className={needSpaceClass(i) ? "min-h-[55dvh]" : ""}
              />
            ))}
            {isLoading && <PreviewMessage.Skeleton />}
            {isArtifactVisible && (
              <Artifact
                chatId={threadId}
                input={input}
                setInput={setInput}
                handleSubmit={handleFormSubmit}
                status={status}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                append={append}
                reload={reload}
                votes={votes}
                isReadonly={isReadonly}
              />
            )}
          </div>
        )}
      </div>
      {!emptyMessage && !isReadonly && (
        <MultimodalInput
          input={input}
          setInput={setInput}
          handleSubmit={handleFormSubmit}
          status={status}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          className="sticky bottom-0 z-10"
        />
      )}
      <form
        onSubmit={handleFormSubmit}
        className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl"
      >
        {!isReadonly && (
          <MultimodalInput
            chatId={threadId}
            input={input}
            setInput={setInput}
            handleSubmit={handleFormSubmit}
            status={status}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
          />
        )}
        {slots?.inputBottomSlot}
      </form>

      <Artifact
        chatId={threadId}
        input={input}
        setInput={setInput}
        handleSubmit={handleFormSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        messages={messages}
        setMessages={setMessages}
        append={append}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />

      <DeleteThreadPopup
        threadId={threadId}
        open={isDeleteThreadPopupOpen}
        onClose={() => setIsDeleteThreadPopupOpen(false)}
      />
    </div>
  );
}

function vercelAISdkV4ToolInvocationIssueCatcher(message: UIMessage) {
  if (message.role != "assistant") return;
  const lastPart = message.parts.at(-1);
  if (lastPart?.type != "tool-invocation") return;
  if (!message.toolInvocations)
    message.toolInvocations = [lastPart.toolInvocation];
}

function DeleteThreadPopup({
  threadId,
  onClose,
  open,
}: { threadId: string; onClose: () => void; open: boolean }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    safe(() => deleteThreadAction(threadId))
      .watch(() => setIsDeleting(false))
      .ifOk(() => {
        toast.success("Thread deleted successfully");
        router.push("/");
      })
      .ifFail(() => toast.error("Failed to delete thread"))
      .watch(() => onClose());
  }, [threadId, router]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Chat</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this Chat thread?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} autoFocus>
            Delete
            {isDeleting && <Loader className="size-3.5 ml-2 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
