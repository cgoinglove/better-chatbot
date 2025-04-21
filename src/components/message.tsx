"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import { cn } from "lib/utils";
import { memo, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import {
  AssistMessagePart,
  FileAttachmentMessagePart,
  ReasoningPart,
  ToolMessagePart,
  UserMessagePart,
} from "./message-parts";

interface Props {
  message: UIMessage;
  threadId: string;
  isLoading: boolean;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
  append?: UseChatHelpers["append"];
  className?: string;
}

const PurePreviewMessage = ({
  message,
  threadId,
  setMessages,
  isLoading,
  reload,
  append,
  className,
}: Props) => {
  const isUserMessage = useMemo(() => message.role === "user", [message.role]);
  return (
    <div className="w-full mx-auto max-w-3xl px-6 group/message fade-in animate-in">
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
            const key = `message-${message.id}-part-${part.type}-${index}`;
            const isLastPart = index === message.parts.length - 1;

            if (part.type === "reasoning") {
              return (
                <ReasoningPart
                  key={key}
                  reasoning={part.reasoning}
                  isThinking={isLastPart && isLoading}
                />
              );
            }

            if (isUserMessage && part.type === "text") {
              return (
                <UserMessagePart
                  key={key}
                  part={part}
                  isLast={isLastPart}
                  message={message}
                  setMessages={setMessages}
                  reload={reload}
                  append={append}
                />
              );
            }

            if (part.type === "text" && !isUserMessage) {
              return (
                <AssistMessagePart
                  threadId={threadId}
                  key={key}
                  part={part}
                  isLast={isLastPart}
                  message={message}
                  setMessages={setMessages}
                  reload={reload}
                />
              );
            }

            if (part.type === "tool-invocation") {
              return <ToolMessagePart key={key} part={part} />;
            }

            if (part.type === "file-attachment") {
              return <FileAttachmentMessagePart key={key} part={part} />;
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
    if (prevProps.className !== nextProps.className) return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    return true;
  },
);

export const ThinkingMessage = ({ className }: { className?: string }) => {
  const role = "assistant";
  return (
    <motion.div
      data-testid="message-assistant-loading"
      className={cn("w-full mx-auto max-w-3xl px-4 group/message", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex space-x-2">
              <motion.div
                className="h-2 w-2 rounded-full bg-primary"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
