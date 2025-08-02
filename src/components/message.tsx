"use client";

import type { UIMessage } from "ai";
import { memo, useMemo, useState } from "react";
import equal from "lib/equal";

import { cn, truncateString } from "lib/utils";
import type { UseChatHelpers } from "@ai-sdk/react";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import {
  UserMessagePart,
  AssistMessagePart,
  ToolMessagePart,
  ReasoningPart,
} from "./message-parts";
import { Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "ui/button";
import { useTranslations } from "next-intl";
import { ChatMessageAnnotation, ClientToolInvocation } from "app-types/chat";

interface Props {
  message: UIMessage;
  threadId?: string;
  isLoading: boolean;
  isLastMessage: boolean;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
  className?: string;
  onPoxyToolCall?: (result: ClientToolInvocation) => void;
  status: UseChatHelpers["status"];
  messageIndex: number;
  isError?: boolean;
}

const PurePreviewMessage = ({
  message,
  threadId,
  setMessages,
  isLoading,
  isLastMessage,
  reload,
  status,
  className,
  onPoxyToolCall,
  messageIndex,
  isError,
}: Props) => {
  const isUserMessage = useMemo(() => message.role === "user", [message.role]);

  if (message.role == "system") {
    return null; // system message is not shown
  }

  if (!message.parts.length) return null;
  return (
    <div className="w-full mx-auto max-w-3xl px-6 group/message">
      <div
        className={cn(
          className,
          "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
        )}
      >
        <div className="flex flex-col gap-4 w-full">
          {message.experimental_attachments && (
            <div
              data-testid={"message-attachments"}
              className="flex flex-row justify-end gap-2"
            >
              {message.experimental_attachments.map((attachment) => (
                <Alert key={attachment.url}>
                  <AlertTitle>Attachment</AlertTitle>
                  <AlertDescription>
                    attachment not yet implemented 😁
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {message.parts?.map((part, index) => {
            const key = `message-${messageIndex}-part-${part.type}-${index}`;
            const isLastPart = index === message.parts.length - 1;

            if (part.type === "reasoning") {
              return (
                <ReasoningPart
                  key={key}
                  reasoning={part.reasoning}
                  isThinking={isLastPart && isLastMessage && isLoading}
                />
              );
            }

            if (isUserMessage && part.type === "text" && part.text) {
              return (
                <UserMessagePart
                  key={key}
                  status={status}
                  part={part}
                  isLast={isLastPart}
                  isError={isError}
                  message={message}
                  setMessages={setMessages}
                  reload={reload}
                />
              );
            }

            if (part.type === "text" && !isUserMessage) {
              return (
                <AssistMessagePart
                  threadId={threadId}
                  isLast={isLastMessage && isLastPart}
                  isLoading={isLoading}
                  key={key}
                  part={part}
                  showActions={
                    isLastMessage ? isLastPart && !isLoading : isLastPart
                  }
                  message={message}
                  setMessages={setMessages}
                  reload={reload}
                  isError={isError}
                />
              );
            }

            if (part.type === "tool-invocation") {
              const isLast = isLastMessage && isLastPart;

              const isManualToolInvocation = (
                message.annotations as ChatMessageAnnotation[]
              )?.some((a) => a.toolChoice == "manual");

              return (
                <ToolMessagePart
                  isLast={isLast}
                  messageId={message.id}
                  isManualToolInvocation={isManualToolInvocation}
                  showActions={
                    isLastMessage ? isLastPart && !isLoading : isLastPart
                  }
                  onPoxyToolCall={onPoxyToolCall}
                  key={key}
                  part={part}
                  isError={isError}
                  setMessages={setMessages}
                />
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.isLastMessage !== nextProps.isLastMessage) return false;
    if (prevProps.className !== nextProps.className) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (prevProps.message.annotations !== nextProps.message.annotations)
      return false;
    if (prevProps.isError !== nextProps.isError) return false;
    if (prevProps.onPoxyToolCall !== nextProps.onPoxyToolCall) return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    return true;
  },
);

export const ErrorMessage = ({
  error,
}: {
  error: Error;
  message?: UIMessage;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 200;
  const t = useTranslations();
  return (
    <div className="w-full mx-auto max-w-3xl px-6 animate-in fade-in mt-4">
      <Alert variant="destructive" className="border-destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle className="mb-2">{t("Chat.Error")}</AlertTitle>
        <AlertDescription className="text-sm">
          <div className="whitespace-pre-wrap">
            {isExpanded
              ? error.message
              : truncateString(error.message, maxLength)}
          </div>
          {error.message.length > maxLength && (
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant={"ghost"}
              className="ml-auto"
              size={"sm"}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  {t("Common.showLess")}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  {t("Common.showMore")}
                </>
              )}
            </Button>
          )}
        </AlertDescription>
        <AlertDescription>
          <p className="text-sm text-muted-foreground my-2">
            {t("Chat.thisMessageWasNotSavedPleaseTryTheChatAgain")}
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};
