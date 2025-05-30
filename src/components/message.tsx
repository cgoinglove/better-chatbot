"use client";

import type { Vote } from "@/lib/db/schema";
import { cn, truncateString } from "@/lib/utils";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import cx from "classnames";
import equal from "fast-deep-equal";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { memo, useState } from "react";
import { DocumentToolCall, DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { PencilEditIcon, SparklesIcon } from "./icons";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Weather } from "./weather";

// Combine Props from message.original.tsx and message.inbound.tsx
interface Props {
  message: UIMessage;
  chatId?: string; // From inbound (replaces threadId)
  threadId?: string; // From original
  isLoading: boolean;
  isLastMessage?: boolean; // From original
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
  className?: string;
  onProxyToolCall?: (answer: boolean) => void; // Updated from onPoxyToolCall
  status?: UseChatHelpers["status"];
  messageIndex?: number;
  isError?: boolean;
  vote?: Vote; // From inbound
  isReadonly?: boolean; // From inbound
  isArtifactVisible?: boolean; // Added for artifact integration
}

const Skeleton = () => (
  <div className="flex gap-3 items-start">
    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
    <div className="space-y-2.5 flex-1">
      <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-[60%] rounded bg-muted animate-pulse" />
        <div className="h-4 w-[80%] rounded bg-muted animate-pulse" />
        <div className="h-4 w-[40%] rounded bg-muted animate-pulse" />
      </div>
    </div>
  </div>
);

const PurePreviewMessage = ({
  message,
  chatId,
  // threadId,
  setMessages,
  isLoading,
  // isLastMessage,
  reload,
  // status,
  // className,
  // onProxyToolCall,
  // messageIndex,
  // isError,
  vote,
  isReadonly = false, // Default to false if not provided
}: Props) => {
  // const isUserMessage = useMemo(() => message.role === "user", [message.role]);
  const [mode, setMode] = useState<"view" | "edit">("view");

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            {
              "w-full": mode === "edit",
              "group-data-[role=user]/message:w-fit": mode !== "edit",
            },
          )}
        >
          {message.role === "assistant" && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            {message.experimental_attachments && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === "reasoning") {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                );
              }

              if (type === "text") {
                if (mode === "view") {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === "user" && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode("edit");
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn("flex flex-col gap-4", {
                          "bg-primary text-primary-foreground px-3 py-2 rounded-xl":
                            message.role === "user",
                        })}
                      >
                        <Markdown>{part.text}</Markdown>
                      </div>
                    </div>
                  );
                }

                if (mode === "edit") {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                      />
                    </div>
                  );
                }
              }

              if (type === "tool-invocation") {
                const { toolInvocation } = part;
                const { toolName, toolCallId, state } = toolInvocation;

                if (state === "call") {
                  const { args } = toolInvocation;

                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ["getWeather"].includes(toolName),
                      })}
                    >
                      {toolName === "getWeather" ? (
                        <Weather />
                      ) : toolName === "createDocument" ? (
                        <DocumentPreview isReadonly={isReadonly} args={args} />
                      ) : toolName === "updateDocument" ? (
                        <DocumentToolCall
                          type="update"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === "requestSuggestions" ? (
                        <DocumentToolCall
                          type="request-suggestions"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : null}
                    </div>
                  );
                }

                if (state === "result") {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === "getWeather" ? (
                        <Weather weatherAtLocation={result} />
                      ) : toolName === "createDocument" ? (
                        <DocumentPreview
                          isReadonly={isReadonly}
                          result={result}
                        />
                      ) : toolName === "updateDocument" ? (
                        <DocumentToolResult
                          type="update"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === "requestSuggestions" ? (
                        <DocumentToolResult
                          type="request-suggestions"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : (
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                      )}
                    </div>
                  );
                }
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId!}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = Object.assign(
  memo(
    PurePreviewMessage,
    (prevProps, nextProps) => {
      // Combined equality checks from both implementations
      return (
        equal(prevProps.message, nextProps.message) &&
        prevProps.isLoading === nextProps.isLoading &&
        prevProps.isLastMessage === nextProps.isLastMessage &&
        prevProps.isError === nextProps.isError &&
        prevProps.vote?.isUpvoted === nextProps.vote?.isUpvoted &&
        prevProps.isReadonly === nextProps.isReadonly &&
        prevProps.onProxyToolCall === nextProps.onProxyToolCall &&
        prevProps.status === nextProps.status &&
        prevProps.messageIndex === nextProps.messageIndex
      );
    },
  ),
  { Skeleton }
);

const role = "assistant";

export const ThinkingMessage = () => {
  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          "flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl",
          {
            "group-data-[role=user]/message:bg-muted": true,
          },
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Hmm...
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Error message component to display errors in a consistent format
 */
export const ErrorMessage = ({
  error,
}: {
  error: Error;
  message?: UIMessage;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 200;

  return (
    <div className="w-full mx-auto max-w-3xl px-6 animate-in fade-in mt-4">
      <Alert variant="destructive" className="border-destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle className="mb-2">Chat Error</AlertTitle>
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
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show more
                </>
              )}
            </Button>
          )}
        </AlertDescription>
        <AlertDescription>
          <p className="text-sm text-muted-foreground my-2">
            This message was not saved. Please try the chat again.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};
