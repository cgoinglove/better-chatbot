"use client";

import { UIMessage } from "ai";
import {
  Check,
  Copy,
  ChevronDown,
  Loader,
  Pencil,
  ChevronDownIcon,
  RefreshCw,
  X,
  Wrench,
  Trash2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { Button } from "ui/button";
import { Markdown } from "./markdown";
import { MessagePastesContentCard } from "./message-pasts-content";
import { cn, safeJSONParse, toAny } from "lib/utils";
import JsonView from "ui/json-view";
import {
  useMemo,
  useState,
  memo,
  useEffect,
  useRef,
  Suspense,
  useCallback,
} from "react";
import { MessageEditor } from "./message-editor";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useCopy } from "@/hooks/use-copy";

import { Card, CardContent } from "ui/card";
import { AnimatePresence, motion } from "framer-motion";
import { SelectModel } from "./select-model";
import { customModelProvider } from "lib/ai/models";
import {
  deleteMessageAction,
  deleteMessagesByChatIdAfterTimestampAction,
} from "@/app/api/chat/actions";

import { toast } from "sonner";
import { safe } from "ts-safe";
import { ChatMessageAnnotation } from "app-types/chat";
import { DefaultToolName } from "lib/ai/tools/utils";
import { Skeleton } from "ui/skeleton";
import { PieChart } from "./tool-invocation/pie-chart";
import { BarChart } from "./tool-invocation/bar-chart";
import { LineChart } from "./tool-invocation/line-chart";
import { PROMPT_PASTE_MAX_LENGTH } from "lib/const";

type MessagePart = UIMessage["parts"][number];

type TextMessagePart = Extract<MessagePart, { type: "text" }>;
type AssistMessagePart = Extract<MessagePart, { type: "text" }>;
type ToolMessagePart = Extract<MessagePart, { type: "tool-invocation" }>;

interface UserMessagePartProps {
  part: TextMessagePart;
  isLast: boolean;
  message: UIMessage;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
  status: UseChatHelpers["status"];
  isError?: boolean;
}

interface AssistMessagePartProps {
  part: AssistMessagePart;
  message: UIMessage;
  showActions: boolean;
  threadId?: string;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
  isError?: boolean;
}

interface ToolMessagePartProps {
  part: ToolMessagePart;
  message: UIMessage;
  showActions: boolean;
  isLast?: boolean;
  onPoxyToolCall?: (answer: boolean) => void;
  isError?: boolean;
  setMessages?: UseChatHelpers["setMessages"];
}

interface HighlightedTextProps {
  text: string;
  mentions: string[];
}

const HighlightedText = memo(({ text, mentions }: HighlightedTextProps) => {
  if (!mentions.length) return text;

  const parts = text.split(/(\s+)/);
  return parts.map((part, index) => {
    if (mentions.includes(part.trim())) {
      return (
        <span key={index} className="mention">
          {part}
        </span>
      );
    }
    return part;
  });
});

HighlightedText.displayName = "HighlightedText";

export const UserMessagePart = ({
  part,
  isLast,
  status,
  message,
  setMessages,
  reload,
  isError,
}: UserMessagePartProps) => {
  const { copied, copy } = useCopy();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isDeleting, setIsDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toolMentions = useMemo(() => {
    if (!message.annotations?.length) return [];
    return Array.from(
      new Set(
        message.annotations
          .flatMap((annotation) => {
            return (annotation as ChatMessageAnnotation).requiredTools ?? [];
          })
          .filter(Boolean)
          .map((v) => `@${v}`),
      ),
    );
  }, [message.annotations]);

  const deleteMessage = useCallback(() => {
    safe(() => setIsDeleting(true))
      .ifOk(() => deleteMessageAction(message.id))
      .ifOk(() =>
        setMessages((messages) => {
          const index = messages.findIndex((m) => m.id === message.id);
          if (index !== -1) {
            return messages.filter((_, i) => i !== index);
          }
          return messages;
        }),
      )
      .ifFail((error) => toast.error(error.message))
      .watch(() => setIsDeleting(false))
      .unwrap();
  }, [message.id]);

  useEffect(() => {
    if (status === "submitted" && isLast) {
      ref.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [status]);

  if (mode === "edit") {
    return (
      <div className="flex flex-row gap-2 items-start w-full">
        <MessageEditor
          message={message}
          setMode={setMode}
          setMessages={setMessages}
          reload={reload}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-end my-2">
      <div
        onClick={() => {
          ref.current?.scrollIntoView({ behavior: "smooth" });
        }}
        data-testid="message-content"
        className={cn(
          "flex flex-col gap-4",
          {
            "bg-accent text-accent-foreground px-4 py-3 rounded-2xl":
              isLast || part.text.length <= PROMPT_PASTE_MAX_LENGTH,
            "opacity-50": isError,
          },
          isError && "border-destructive border",
        )}
      >
        {isLast || part.text.length <= PROMPT_PASTE_MAX_LENGTH ? (
          <p className={cn("whitespace-pre-wrap text-sm")}>
            <HighlightedText text={part.text} mentions={toolMentions} />
          </p>
        ) : (
          <MessagePastesContentCard initialContent={part.text} readonly />
        )}
      </div>

      <div className="flex w-full justify-end">
        {isLast && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="message-edit-button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-3! p-4! opacity-0 group-hover/message:opacity-100",
                  )}
                  onClick={() => copy(part.text)}
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Copy</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="message-edit-button"
                  variant="ghost"
                  size="icon"
                  className="size-3! p-4! opacity-0 group-hover/message:opacity-100"
                  onClick={() => setMode("edit")}
                >
                  <Pencil />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={isDeleting}
                  onClick={deleteMessage}
                  variant="ghost"
                  size="icon"
                  className="size-3! p-4! opacity-0 group-hover/message:opacity-100 hover:text-destructive"
                >
                  {isDeleting ? (
                    <Loader className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-destructive" side="bottom">
                Delete Message
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
      <div ref={ref} className="min-w-0" />
    </div>
  );
};

const modelList = customModelProvider.modelsInfo;

export const AssistMessagePart = ({
  part,
  showActions,
  reload,
  message,
  setMessages,
  isError,
  threadId,
}: AssistMessagePartProps) => {
  const { copied, copy } = useCopy();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMessage = useCallback(() => {
    safe(() => setIsDeleting(true))
      .ifOk(() => deleteMessageAction(message.id))
      .ifOk(() =>
        setMessages((messages) => {
          const index = messages.findIndex((m) => m.id === message.id);
          if (index !== -1) {
            return messages.filter((_, i) => i !== index);
          }
          return messages;
        }),
      )
      .ifFail((error) => toast.error(error.message))
      .watch(() => setIsDeleting(false))
      .unwrap();
  }, [message.id]);

  const handleModelChange = (model: string) => {
    safe(() => setIsLoading(true))
      .ifOk(() =>
        threadId
          ? deleteMessagesByChatIdAfterTimestampAction(message.id)
          : Promise.resolve(),
      )
      .ifOk(() =>
        setMessages((messages) => {
          const index = messages.findIndex((m) => m.id === message.id);
          if (index !== -1) {
            return [...messages.slice(0, index)];
          }
          return messages;
        }),
      )
      .ifOk(() =>
        reload({
          body: {
            model,
            action: "update-assistant",
            id: threadId,
          },
        }),
      )
      .ifFail((error) => toast.error(error.message))
      .watch(() => setIsLoading(false))
      .unwrap();
  };

  return (
    <div
      className={cn(isLoading && "animate-pulse", "flex flex-col gap-2 group")}
    >
      <div
        data-testid="message-content"
        className={cn("flex flex-col gap-4 px-2", {
          "opacity-50 border border-destructive bg-card rounded-lg": isError,
        })}
      >
        <Markdown>{part.text}</Markdown>
      </div>
      {showActions && (
        <div className="flex w-full ">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="message-edit-button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-3! p-4! opacity-0 group-hover/message:opacity-100",
                )}
                onClick={() => copy(part.text)}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SelectModel
                  model={""}
                  onSelect={handleModelChange}
                  providers={modelList}
                >
                  <Button
                    data-testid="message-edit-button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-3! p-4! opacity-0 group-hover/message:opacity-100",
                    )}
                  >
                    {<RefreshCw />}
                  </Button>
                </SelectModel>
              </div>
            </TooltipTrigger>
            <TooltipContent>Change Model</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleting}
                onClick={deleteMessage}
                className="size-3! p-4! opacity-0 group-hover/message:opacity-100 hover:text-destructive"
              >
                {isDeleting ? <Loader className="animate-spin" /> : <Trash2 />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-destructive" side="bottom">
              Delete Message
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export const ToolMessagePart = memo(
  ({
    part,
    isLast,
    showActions,
    onPoxyToolCall,
    isError,
    message,
    setMessages,
  }: ToolMessagePartProps) => {
    const { toolInvocation } = part;
    const { toolName, toolCallId, state, args } = toolInvocation;
    const [isExpanded, setIsExpanded] = useState(false);
    const { copied: copiedInput, copy: copyInput } = useCopy();
    const { copied: copiedOutput, copy: copyOutput } = useCopy();
    const [isDeleting, setIsDeleting] = useState(false);
    const isExecuting = state !== "result" && (isLast || onPoxyToolCall);
    const deleteMessage = useCallback(() => {
      safe(() => setIsDeleting(true))
        .ifOk(() => deleteMessageAction(message.id))
        .ifOk(() =>
          setMessages?.((messages) => {
            const index = messages.findIndex((m) => m.id === message.id);
            if (index !== -1) {
              return messages.filter((_, i) => i !== index);
            }
            return messages;
          }),
        )
        .ifFail((error) => toast.error(error.message))
        .watch(() => setIsDeleting(false))
        .unwrap();
    }, [message.id, setMessages]);
    const ToolResultComponent = useMemo(() => {
      if (state === "result") {
        switch (toolName) {
          case DefaultToolName.CreatePieChart:
            return (
              <Suspense
                fallback={<Skeleton className="h-64 w-full rounded-md" />}
              >
                <PieChart
                  key={`${toolCallId}-${toolName}`}
                  {...(args as any)}
                />
              </Suspense>
            );
          case DefaultToolName.CreateBarChart:
            return (
              <Suspense
                fallback={<Skeleton className="h-64 w-full rounded-md" />}
              >
                <BarChart
                  key={`${toolCallId}-${toolName}`}
                  {...(args as any)}
                />
              </Suspense>
            );
          case DefaultToolName.CreateLineChart:
            return (
              <Suspense
                fallback={<Skeleton className="h-64 w-full rounded-md" />}
              >
                <LineChart
                  key={`${toolCallId}-${toolName}`}
                  {...(args as any)}
                />
              </Suspense>
            );
        }
      }
      return null;
    }, [toolName, state]);

    const result = useMemo(() => {
      if (state === "result") {
        return toolInvocation.result?.content
          ? {
              ...toolInvocation.result,
              content: toolInvocation.result.content.map((node) => {
                if (node.type === "text") {
                  const parsed = safeJSONParse(node.text);
                  return {
                    ...node,
                    text: parsed.success ? parsed.value : node.text,
                  };
                }
                return node;
              }),
            }
          : toolInvocation.result;
      }
      return null;
    }, [state, toolInvocation]);

    return (
      <div key={toolCallId} className="flex flex-col gap-2 group w-full">
        {ToolResultComponent ? (
          ToolResultComponent
        ) : (
          <>
            <div className="flex flex-row gap-2 items-center cursor-pointer">
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                variant="outline"
                className={cn(
                  "flex flex-row gap-2 justify-between items-center text-muted-foreground min-w-44 bg-card",
                  isExecuting && "animate-pulse bg-input",
                  isError && "border-destructive",
                )}
              >
                <Wrench className="size-3.5" />
                <p className={cn("font-bold")}>{toolName}</p>
                {isExecuting ? (
                  <Loader className="size-3 animate-spin" />
                ) : (
                  <ChevronDown
                    className={cn(
                      isExpanded && "rotate-180",
                      "transition-transform",
                      "size-4",
                    )}
                  />
                )}
              </Button>
              {onPoxyToolCall && (
                <>
                  <Button
                    variant="outline"
                    className="bg-input"
                    size="icon"
                    onClick={() => onPoxyToolCall(true)}
                  >
                    <Check />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPoxyToolCall(false)}
                  >
                    <X />
                  </Button>
                </>
              )}
            </div>
            {isExpanded && (
              <Card className="relative mt-2 p-4 max-h-[50vh] overflow-y-auto bg-card">
                <CardContent className="flex flex-row gap-4 text-sm ">
                  <div className="w-1/2 min-w-0 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 pt-2 pb-1 z-10">
                      <h5 className="text-muted-foreground text-sm font-medium">
                        Inputs
                      </h5>
                      <div className="flex-1" />

                      {copiedInput ? (
                        <Check className="size-4" />
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-3 text-muted-foreground"
                          onClick={() =>
                            copyInput(JSON.stringify(toolInvocation.args))
                          }
                        >
                          <Copy />
                        </Button>
                      )}
                    </div>
                    <JsonView data={toolInvocation.args} />
                  </div>

                  <div className="w-1/2 min-w-0 pl-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 pt-2 pb-1  z-10">
                      <h5 className="text-muted-foreground text-sm font-medium">
                        Outputs
                      </h5>
                      <div className="flex-1" />
                      {copiedOutput ? (
                        <Check className="size-4" />
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-3 text-muted-foreground"
                          onClick={() =>
                            copyOutput(
                              JSON.stringify(toAny(toolInvocation).result),
                            )
                          }
                        >
                          <Copy />
                        </Button>
                      )}
                    </div>
                    <JsonView data={result} />
                  </div>
                </CardContent>
              </Card>
            )}
            {showActions && (
              <div className="flex flex-row gap-2 items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      disabled={isDeleting}
                      onClick={deleteMessage}
                      variant="ghost"
                      size="icon"
                      className="size-3! p-4! opacity-0 group-hover/message:opacity-100 hover:text-destructive"
                    >
                      {isDeleting ? (
                        <Loader className="animate-spin" />
                      ) : (
                        <Trash2 />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-destructive" side="bottom">
                    Delete Message
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

ToolMessagePart.displayName = "ToolMessagePart";
export function ReasoningPart({
  reasoning,
}: {
  reasoning: string;
  isThinking?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: "auto",
      opacity: 1,
      marginTop: "1rem",
      marginBottom: "0.5rem",
    },
  };

  return (
    <div
      className="flex flex-col cursor-pointer"
      onClick={() => {
        setIsExpanded(!isExpanded);
      }}
    >
      <div className="flex flex-row gap-2 items-center text-ring hover:text-primary transition-colors">
        <div className="font-medium">Reasoned for a few seconds</div>
        <button
          data-testid="message-reasoning-toggle"
          type="button"
          className="cursor-pointer"
        >
          <ChevronDownIcon size={16} />
        </button>
      </div>

      <div className="pl-4">
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              data-testid="message-reasoning"
              key="content"
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              variants={variants}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
              className="pl-6 text-muted-foreground border-l flex flex-col gap-4"
            >
              <Markdown>{reasoning}</Markdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
