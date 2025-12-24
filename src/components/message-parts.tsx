"use client";

import { FileUIPart, getToolName, ToolUIPart, UIMessage } from "ai";
import {
  Check,
  Copy,
  Loader,
  Pencil,
  ChevronDownIcon,
  ChevronUp,
  RefreshCw,
  X,
  Trash2,
  ChevronRight,
  TriangleAlert,
  HammerIcon,
  EllipsisIcon,
  FileIcon,
  Download,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { Markdown } from "./markdown";
import { cn, safeJSONParse, truncateString } from "lib/utils";
import JsonView from "ui/json-view";
import { useMemo, useState, memo, useEffect, useRef, useCallback } from "react";
import { MessageEditor } from "./message-editor";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useCopy } from "@/hooks/use-copy";

import { AnimatePresence, motion } from "framer-motion";
import { SelectModel } from "./select-model";
import {
  deleteMessageAction,
  deleteMessagesByChatIdAfterTimestampAction,
} from "@/app/api/chat/actions";

import { toast } from "sonner";
import { safe } from "ts-safe";
import { ChatMetadata, ChatModel, ManualToolConfirmTag } from "app-types/chat";

import { useTranslations } from "next-intl";
import { extractMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { Separator } from "ui/separator";

import { TextShimmer } from "ui/text-shimmer";
import equal from "lib/equal";
import {
  VercelAIWorkflowToolStreamingResult,
  VercelAIWorkflowToolStreamingResultTag,
} from "app-types/workflow";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { DefaultToolName, ImageToolName } from "lib/ai/tools";
import {
  Shortcut,
  getShortcutKeyList,
  isShortcutEvent,
} from "lib/keyboard-shortcuts";

import { WorkflowInvocation } from "./tool-invocation/workflow-invocation";
import dynamic from "next/dynamic";
import { notify } from "lib/notify";
import { ModelProviderIcon } from "ui/model-provider-icon";
import { appStore } from "@/app/store";
import { BACKGROUND_COLORS, EMOJI_DATA } from "lib/const";

type MessagePart = UIMessage["parts"][number];
type TextMessagePart = Extract<MessagePart, { type: "text" }>;
type AssistMessagePart = Extract<MessagePart, { type: "text" }>;

interface UserMessagePartProps {
  part: TextMessagePart;
  isLast: boolean;
  message: UIMessage;
  setMessages?: UseChatHelpers<UIMessage>["setMessages"];
  sendMessage?: UseChatHelpers<UIMessage>["sendMessage"];
  status?: UseChatHelpers<UIMessage>["status"];
  isError?: boolean;
  readonly?: boolean;
}

interface AssistMessagePartProps {
  part: AssistMessagePart;
  isLast?: boolean;
  isLoading?: boolean;
  message: UIMessage;
  prevMessage?: UIMessage;
  showActions: boolean;
  threadId?: string;
  setMessages?: UseChatHelpers<UIMessage>["setMessages"];
  sendMessage?: UseChatHelpers<UIMessage>["sendMessage"];
  isError?: boolean;
  readonly?: boolean;
}

interface ToolMessagePartProps {
  part: ToolUIPart;
  messageId: string;
  showActions: boolean;
  isLast?: boolean;
  isManualToolInvocation?: boolean;
  addToolResult?: UseChatHelpers<UIMessage>["addToolResult"];
  isError?: boolean;
  setMessages?: UseChatHelpers<UIMessage>["setMessages"];
  readonly?: boolean;
}

const MAX_TEXT_LENGTH = 600;
export const UserMessagePart = memo(
  function UserMessagePart({
    part,
    isLast,
    status,
    message,
    setMessages,
    sendMessage,
    readonly,
    isError,
  }: UserMessagePartProps) {
    const { copied, copy } = useCopy();
    const t = useTranslations();
    const [mode, setMode] = useState<"view" | "edit">("view");
    const [isDeleting, setIsDeleting] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const scrolledRef = useRef(false);

    const isLongText = part.text.length > MAX_TEXT_LENGTH;
    const displayText =
      expanded || !isLongText
        ? part.text
        : truncateString(part.text, MAX_TEXT_LENGTH);

    const deleteMessage = useCallback(async () => {
      if (!setMessages) return;
      const ok = await notify.confirm({
        title: "Delete Message",
        description: "Are you sure you want to delete this message?",
      });
      if (!ok) return;
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
      if (status === "submitted" && isLast && !scrolledRef.current) {
        scrolledRef.current = true;
        ref.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, [status]);

    if (mode === "edit" && setMessages && sendMessage) {
      return (
        <div className="flex flex-row gap-2 items-start w-full">
          <MessageEditor
            message={message}
            setMode={setMode}
            setMessages={setMessages}
            sendMessage={sendMessage}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 items-end my-2">
        <div
          data-testid="message-content"
          className={cn(
            "flex flex-col gap-4 max-w-full ring ring-input relative overflow-hidden",
            {
              "bg-accent text-accent-foreground px-4 py-3 rounded-2xl": isLast,
              "opacity-50": isError,
            },
            isError && "border-destructive border",
          )}
        >
          {isLongText && !expanded && (
            <div className="absolute pointer-events-none bg-gradient-to-t from-accent to-transparent w-full h-40 bottom-0 left-0" />
          )}
          <p className={cn("whitespace-pre-wrap text-sm break-words")}>
            {displayText}
          </p>
          {isLongText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-auto p-1 text-xs z-10 text-muted-foreground hover:text-foreground self-start"
            >
              <span className="flex items-center gap-1">
                {t(expanded ? "Common.showLess" : "Common.showMore")}
                {expanded ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDownIcon className="size-3" />
                )}
              </span>
            </Button>
          )}
        </div>
        {isLast && (
          <div className="flex w-full justify-end md:opacity-0 group-hover/message:opacity-100 transition-opacity duration-300">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="message-edit-button"
                  variant="ghost"
                  size="icon"
                  className={cn("size-3! p-4!")}
                  onClick={() => copy(part.text)}
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Copy</TooltipContent>
            </Tooltip>
            {!readonly && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="message-edit-button"
                      variant="ghost"
                      size="icon"
                      className="size-3! p-4!"
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
                      className="size-3! p-4! hover:text-destructive"
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
        )}
        <div ref={ref} className="min-w-0" />
      </div>
    );
  },
  (prev, next) => {
    if (prev.part.text != next.part.text) return false;
    if (prev.isError != next.isError) return false;
    if (prev.isLast != next.isLast) return false;
    if (prev.status != next.status) return false;
    if (prev.message.id != next.message.id) return false;
    if (!equal(prev.part, next.part)) return false;
    return true;
  },
);
UserMessagePart.displayName = "UserMessagePart";

export const AssistMessagePart = memo(function AssistMessagePart({
  part,
  showActions,
  message,
  prevMessage,
  isError,
  threadId,
  setMessages,
  readonly,
  sendMessage,
}: AssistMessagePartProps) {
  const { copied, copy } = useCopy();
  const [isLoading, setIsLoading] = useState(false);
  const agentList = appStore((state) => state.agentList);
  const [isDeleting, setIsDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const metadata = message.metadata as ChatMetadata | undefined;

  const agent = useMemo(() => {
    return agentList.find((a) => a.id === metadata?.agentId);
  }, [metadata, agentList]);

  const deleteMessage = useCallback(async () => {
    if (!setMessages) return;
    const ok = await notify.confirm({
      title: "Delete Message",
      description: "Are you sure you want to delete this message?",
    });
    if (!ok) return;
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

  const handleModelChange = (model: ChatModel) => {
    if (!setMessages || !sendMessage || !prevMessage) return;
    safe(() => setIsLoading(true))
      .ifOk(() =>
        threadId
          ? deleteMessagesByChatIdAfterTimestampAction(message.id)
          : Promise.resolve(),
      )
      .ifOk(() =>
        setMessages((messages) => {
          const index = messages.findIndex((m) => m.id === prevMessage.id);
          if (index !== -1) {
            return [...messages.slice(0, index)];
          }
          return messages;
        }),
      )
      .ifOk(() =>
        sendMessage(prevMessage, {
          body: {
            model,
          },
        }),
      )
      .ifFail((error) => toast.error(error.message))
      .watch(() => setIsLoading(false))
      .unwrap();
  };

  return (
    <div
      className={cn(
        isLoading && "animate-pulse",
        "flex flex-col gap-2 group/message",
      )}
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
        <div className="flex w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="message-edit-button"
                variant="ghost"
                size="icon"
                className="size-3! p-4!"
                onClick={() => copy(part.text)}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
          {!readonly && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SelectModel onSelect={handleModelChange}>
                      <Button
                        data-testid="message-edit-button data-[state=open]:bg-secondary!"
                        variant="ghost"
                        size="icon"
                        className="size-3! p-4!"
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
                    className="size-3! p-4! hover:text-destructive"
                  >
                    {isDeleting ? (
                      <Loader className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-destructive">
                  Delete Message
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {metadata && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-3! p-4! opacity-0 group-hover/message:opacity-100 transition-opacity duration-300"
                >
                  <EllipsisIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="p-4 w-72 bg-card border shadow-lg">
                <div className="space-y-4">
                  {agent && (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          Agent
                        </h4>
                        <div className="flex gap-3 items-center">
                          <div
                            className="p-1.5 rounded-full ring-2 ring-border/50 bg-background shadow-sm"
                            style={{
                              backgroundColor:
                                agent.icon?.style?.backgroundColor ||
                                BACKGROUND_COLORS[0],
                            }}
                          >
                            <Avatar className="size-3">
                              <AvatarImage
                                src={agent.icon?.value || EMOJI_DATA[0]}
                              />
                              <AvatarFallback className="bg-transparent text-xs">
                                {agent.name[0]}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <span className="font-medium text-sm">
                            {agent.name}
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-border/50" />
                    </>
                  )}

                  {metadata.chatModel && (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          Model
                        </h4>
                        <div className="flex gap-3 items-center">
                          <ModelProviderIcon
                            provider={metadata.chatModel.provider}
                            className="size-5 flex-shrink-0"
                          />
                          <div className="space-y-0.5 flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {metadata.chatModel.provider}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {metadata.chatModel.model}
                              {metadata.toolCount !== undefined &&
                                metadata.toolCount > 0 && (
                                  <span className="ml-2">
                                    • {metadata.toolCount} tools
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-border/50" />
                    </>
                  )}

                  {metadata.usage && (
                    <>
                      <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          Token Usage
                          <span className="text-xs text-muted-foreground font-normal">
                            {
                              message.parts.filter(
                                (v) => v.type != "step-start",
                              ).length
                            }{" "}
                            Steps
                          </span>
                        </h4>
                        <p className="px-2 mb-2 text-xs text-muted-foreground">
                          High input token usage may occur when many tools are
                          available.
                        </p>
                        <div className="space-y-2">
                          {metadata.usage.inputTokens !== undefined && (
                            <div className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/30">
                              <span className="text-xs text-muted-foreground">
                                Input
                              </span>
                              <span className="text-xs font-mono font-medium">
                                {metadata.usage.inputTokens.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {metadata.usage.outputTokens !== undefined && (
                            <div className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/30">
                              <span className="text-xs text-muted-foreground">
                                Output
                              </span>
                              <span className="text-xs font-mono font-medium">
                                {metadata.usage.outputTokens.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {metadata.usage.totalTokens !== undefined && (
                            <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-primary/10 border border-primary/20">
                              <span className="text-xs font-medium text-primary">
                                Total
                              </span>
                              <span className="text-xs font-mono font-bold text-primary">
                                {metadata.usage.totalTokens.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      <div ref={ref} className="min-w-0" />
    </div>
  );
});
AssistMessagePart.displayName = "AssistMessagePart";
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
export const ReasoningPart = memo(function ReasoningPart({
  reasoningText,
  isThinking,
}: {
  reasoningText: string;
  isThinking?: boolean;
  readonly?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isThinking);

  useEffect(() => {
    if (!isThinking && isExpanded) {
      setIsExpanded(false);
    }
  }, [isThinking]);

  return (
    <div
      className="flex flex-col cursor-pointer"
      onClick={() => {
        setIsExpanded(!isExpanded);
      }}
    >
      <div className="flex flex-row gap-2 items-center text-ring hover:text-primary transition-colors">
        {isThinking ? (
          <TextShimmer>Reasoned for a few seconds</TextShimmer>
        ) : (
          <div className="font-medium">Reasoned for a few seconds</div>
        )}

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
              <Markdown>
                {reasoningText || (isThinking ? "" : "Hmm, let's see...🤔")}
              </Markdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
ReasoningPart.displayName = "ReasoningPart";

const loading = memo(function Loading() {
  return (
    <div className="px-6 py-4">
      <div className="h-44 w-full rounded-md opacity-0" />
    </div>
  );
});

const PieChart = dynamic(
  () => import("./tool-invocation/pie-chart").then((mod) => mod.PieChart),
  {
    ssr: false,
    loading,
  },
);

const BarChart = dynamic(
  () => import("./tool-invocation/bar-chart").then((mod) => mod.BarChart),
  {
    ssr: false,
    loading,
  },
);

const LineChart = dynamic(
  () => import("./tool-invocation/line-chart").then((mod) => mod.LineChart),
  {
    ssr: false,
    loading,
  },
);

const InteractiveTable = dynamic(
  () =>
    import("./tool-invocation/interactive-table").then(
      (mod) => mod.InteractiveTable,
    ),
  {
    ssr: false,
    loading,
  },
);

const WebSearchToolInvocation = dynamic(
  () =>
    import("./tool-invocation/web-search").then(
      (mod) => mod.WebSearchToolInvocation,
    ),
  {
    ssr: false,
    loading,
  },
);

const CodeExecutor = dynamic(
  () =>
    import("./tool-invocation/code-executor").then((mod) => mod.CodeExecutor),
  {
    ssr: false,
    loading,
  },
);

const ImageGeneratorToolInvocation = dynamic(
  () =>
    import("./tool-invocation/image-generator").then(
      (mod) => mod.ImageGeneratorToolInvocation,
    ),
  {
    ssr: false,
    loading,
  },
);

// Local shortcuts for tool invocation approval/rejection
const approveToolInvocationShortcut: Shortcut = {
  description: "approveToolInvocation",
  shortcut: {
    key: "Enter",
    command: true,
  },
};

const rejectToolInvocationShortcut: Shortcut = {
  description: "rejectToolInvocation",
  shortcut: {
    key: "Escape",
    command: true,
  },
};

export const ToolMessagePart = memo(
  ({
    part,
    isLast,
    showActions,
    addToolResult,
    isError,
    messageId,
    setMessages,
    isManualToolInvocation,
  }: ToolMessagePartProps) => {
    const t = useTranslations("");

    const { output, toolCallId, state, input, errorText } = part;

    const toolName = useMemo(() => getToolName(part), [part.type]);

    const isCompleted = useMemo(() => {
      return state.startsWith("output");
    }, [state]);

    const [expanded, setExpanded] = useState(false);
    const { copied: copiedInput, copy: copyInput } = useCopy();
    const { copied: copiedOutput, copy: copyOutput } = useCopy();
    const [isDeleting, setIsDeleting] = useState(false);

    // Handle keyboard shortcuts for approve/reject actions
    useEffect(() => {
      // Only enable shortcuts when manual tool invocation buttons are shown
      if (!isManualToolInvocation) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        const isApprove = isShortcutEvent(e, approveToolInvocationShortcut);
        const isReject = isShortcutEvent(e, rejectToolInvocationShortcut);

        if (!isApprove && !isReject) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (isApprove) {
          addToolResult?.({
            tool: toolName,
            toolCallId,
            output: ManualToolConfirmTag.create({ confirm: true }),
          });
        }

        if (isReject) {
          addToolResult?.({
            tool: toolName,
            toolCallId,
            output: ManualToolConfirmTag.create({ confirm: false }),
          });
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isManualToolInvocation, isLast]);

    const deleteMessage = useCallback(async () => {
      const ok = await notify.confirm({
        title: "Delete Message",
        description: "Are you sure you want to delete this message?",
      });
      if (!ok) return;
      safe(() => setIsDeleting(true))
        .ifOk(() => deleteMessageAction(messageId))
        .ifOk(() =>
          setMessages?.((messages) => {
            const index = messages.findIndex((m) => m.id === messageId);
            if (index !== -1) {
              return messages.filter((_, i) => i !== index);
            }
            return messages;
          }),
        )
        .ifFail((error) => toast.error(error.message))
        .watch(() => setIsDeleting(false))
        .unwrap();
    }, [messageId]);

    const onToolCallDirect = useCallback(
      (result: any) => {
        addToolResult?.({
          tool: toolName,
          toolCallId,
          output: result,
        });
      },
      [addToolResult, toolCallId],
    );

    const result = useMemo(() => {
      if (state == "output-error") {
        return errorText;
      }
      if (isCompleted) {
        return Array.isArray(output)
          ? {
              ...output,
              content: output.map((node) => {
                // mcp tools
                if (node?.type === "text" && typeof node?.text === "string") {
                  const parsed = safeJSONParse(node.text);
                  return {
                    ...node,
                    text: parsed.success ? parsed.value : node.text,
                  };
                }
                return node;
              }),
            }
          : output;
      }
      return null;
    }, [isCompleted, output, state, errorText]);

    const isWorkflowTool = useMemo(
      () => VercelAIWorkflowToolStreamingResultTag.isMaybe(result),
      [result],
    );

    const CustomToolComponent = useMemo(() => {
      if (
        toolName === DefaultToolName.WebSearch ||
        toolName === DefaultToolName.WebContent
      ) {
        return <WebSearchToolInvocation part={part} />;
      }

      if (toolName === ImageToolName) {
        return <ImageGeneratorToolInvocation part={part} />;
      }

      if (toolName === DefaultToolName.JavascriptExecution) {
        return (
          <CodeExecutor
            part={part}
            key={part.toolCallId}
            onResult={onToolCallDirect}
            type="javascript"
          />
        );
      }

      if (toolName === DefaultToolName.PythonExecution) {
        return (
          <CodeExecutor
            part={part}
            key={part.toolCallId}
            onResult={onToolCallDirect}
            type="python"
          />
        );
      }

      if (state === "output-available") {
        switch (toolName) {
          case DefaultToolName.CreatePieChart:
            return (
              <PieChart key={`${toolCallId}-${toolName}`} {...(input as any)} />
            );
          case DefaultToolName.CreateBarChart:
            return (
              <BarChart key={`${toolCallId}-${toolName}`} {...(input as any)} />
            );
          case DefaultToolName.CreateLineChart:
            return (
              <LineChart
                key={`${toolCallId}-${toolName}`}
                {...(input as any)}
              />
            );
          case DefaultToolName.CreateTable:
            return (
              <InteractiveTable
                key={`${toolCallId}-${toolName}`}
                {...(input as any)}
              />
            );
        }
      }
      return null;
    }, [toolName, state, onToolCallDirect, result, input]);

    const { serverName: mcpServerName, toolName: mcpToolName } = useMemo(() => {
      return extractMCPToolId(toolName);
    }, [toolName]);

    const isExpanded = useMemo(() => {
      return expanded || result === null || isWorkflowTool;
    }, [expanded, result, isWorkflowTool]);

    const isExecuting = useMemo(() => {
      if (isWorkflowTool)
        return (
          (result as VercelAIWorkflowToolStreamingResult)?.status == "running"
        );
      return !isCompleted && isLast;
    }, [isWorkflowTool, isCompleted, result, isLast]);

    return (
      <div className="group w-full">
        {CustomToolComponent ? (
          CustomToolComponent
        ) : (
          <div className="flex flex-col fade-in duration-300 animate-in">
            <div
              className="flex gap-2 items-center cursor-pointer group/title"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="p-1.5 text-primary bg-input/40 rounded">
                {isExecuting ? (
                  <Loader className="size-3.5 animate-spin" />
                ) : isError ? (
                  <TriangleAlert className="size-3.5 text-destructive" />
                ) : isWorkflowTool ? (
                  <Avatar className="size-3.5">
                    <AvatarImage
                      src={
                        (result as VercelAIWorkflowToolStreamingResult)
                          .workflowIcon?.value
                      }
                    />
                    <AvatarFallback>
                      {toolName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <HammerIcon className="size-3.5" />
                )}
              </div>
              <span className="font-bold flex items-center gap-2">
                {isExecuting ? (
                  <TextShimmer>{mcpServerName}</TextShimmer>
                ) : (
                  mcpServerName
                )}
              </span>
              {mcpToolName && (
                <>
                  <ChevronRight className="size-3.5" />
                  <span className="text-muted-foreground group-hover/title:text-primary transition-colors duration-300">
                    {mcpToolName}
                  </span>
                </>
              )}
              <div className="ml-auto group-hover/title:bg-input p-1.5 rounded transition-colors duration-300">
                <ChevronDownIcon
                  className={cn(isExpanded && "rotate-180", "size-3.5")}
                />
              </div>
            </div>
            <div className="flex gap-2 py-2">
              <div className="w-7 flex justify-center">
                <Separator
                  orientation="vertical"
                  className="h-full bg-gradient-to-t from-transparent to-border to-5%"
                />
              </div>
              <div className="w-full flex flex-col gap-2">
                <div
                  className={cn(
                    "min-w-0 w-full p-4 rounded-lg bg-card px-4 border text-xs transition-colors fade-300",
                    !isExpanded && "hover:bg-secondary cursor-pointer",
                  )}
                  onClick={() => {
                    if (!isExpanded) {
                      setExpanded(true);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <h5 className="text-muted-foreground font-medium select-none transition-colors">
                      Request
                    </h5>
                    <div className="flex-1" />
                    {copiedInput ? (
                      <Check className="size-3" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-3 text-muted-foreground"
                        onClick={() => copyInput(JSON.stringify(input))}
                      >
                        <Copy className="size-3" />
                      </Button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="p-2 max-h-[300px] overflow-y-auto ">
                      <JsonView data={input} />
                    </div>
                  )}
                </div>
                {!result ? null : isWorkflowTool ? (
                  <WorkflowInvocation
                    result={result as VercelAIWorkflowToolStreamingResult}
                  />
                ) : (
                  <div
                    className={cn(
                      "min-w-0 w-full p-4 rounded-lg bg-card px-4 border text-xs mt-2 transition-colors fade-300",
                      !isExpanded && "hover:bg-secondary cursor-pointer",
                    )}
                    onClick={() => {
                      if (!isExpanded) {
                        setExpanded(true);
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <h5 className="text-muted-foreground font-medium select-none">
                        Response
                      </h5>
                      <div className="flex-1" />
                      {copiedOutput ? (
                        <Check className="size-3" />
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-3 text-muted-foreground"
                          onClick={() => copyOutput(JSON.stringify(result))}
                        >
                          <Copy className="size-3" />
                        </Button>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="p-2 max-h-[300px] overflow-y-auto">
                        <JsonView data={result} />
                      </div>
                    )}
                  </div>
                )}

                {isManualToolInvocation && (
                  <div className="flex flex-row gap-2 items-center mt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full text-xs hover:ring py-2"
                      onClick={() =>
                        addToolResult?.({
                          tool: toolName,
                          toolCallId,
                          output: ManualToolConfirmTag.create({
                            confirm: true,
                          }),
                        })
                      }
                    >
                      <Check />
                      {t("Common.approve")}
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-muted-foreground">
                        {getShortcutKeyList(approveToolInvocationShortcut).join(
                          " ",
                        )}
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs py-2"
                      onClick={() =>
                        addToolResult?.({
                          tool: toolName,
                          toolCallId,
                          output: ManualToolConfirmTag.create({
                            confirm: false,
                          }),
                        })
                      }
                    >
                      <X />
                      {t("Common.reject")}
                      <Separator orientation="vertical" />
                      <span className="text-muted-foreground">
                        {getShortcutKeyList(rejectToolInvocationShortcut).join(
                          " ",
                        )}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

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
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    if (prev.isError !== next.isError) return false;
    if (prev.isLast !== next.isLast) return false;
    if (prev.showActions !== next.showActions) return false;
    if (prev.isManualToolInvocation !== next.isManualToolInvocation)
      return false;
    if (prev.messageId !== next.messageId) return false;
    if (!equal(prev.part, next.part)) return false;
    return true;
  },
);

ToolMessagePart.displayName = "ToolMessagePart";

// File Message Part Component
interface FileMessagePartProps {
  part: FileUIPart; // FileUIPart from AI SDK
  isUserMessage: boolean;
}

export const FileMessagePart = memo(
  ({ part, isUserMessage }: FileMessagePartProps) => {
    const isImage = part.mediaType?.startsWith("image/");

    const fileExtension =
      part.filename?.split(".").pop()?.toUpperCase() ||
      part.mediaType?.split("/").pop()?.toUpperCase() ||
      "FILE";
    const fileUrl = part.url;
    const filename =
      part.filename || part.url?.split("/").pop() || "Attachment";
    const secondaryLabel =
      part.mediaType && part.mediaType !== "application/octet-stream"
        ? part.mediaType
        : undefined;

    if (isImage && fileUrl) {
      return (
        <div
          className={cn(
            "max-w-md rounded-lg overflow-hidden border border-border",
            isUserMessage ? "ml-auto" : "mr-auto",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={part.filename || "Uploaded image"}
            className="w-full h-auto"
          />
          {part.filename && (
            <div className="px-3 py-2 bg-muted text-sm text-muted-foreground">
              {part.filename}
            </div>
          )}
        </div>
      );
    }

    // Non-image file
    return (
      <div
        className={cn(
          "max-w-md rounded-2xl border border-border/80 p-4 shadow-sm backdrop-blur-sm",
          isUserMessage
            ? "ml-auto bg-accent text-accent-foreground border-accent/40"
            : "mr-auto bg-muted/60 text-foreground",
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex-shrink-0 rounded-xl p-3",
              isUserMessage ? "bg-accent-foreground/10" : "bg-muted",
            )}
          >
            <FileIcon
              className={cn(
                "size-6",
                isUserMessage
                  ? "text-accent-foreground/80"
                  : "text-muted-foreground",
              )}
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1 pr-3">
            <p
              className={cn(
                "text-sm font-medium line-clamp-1",
                isUserMessage ? "text-accent-foreground" : "text-foreground",
              )}
              title={filename}
            >
              {filename}
            </p>
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 text-xs",
                isUserMessage
                  ? "text-accent-foreground/70"
                  : "text-muted-foreground",
              )}
            >
              <Badge
                variant="outline"
                className={cn(
                  "uppercase tracking-wide px-2 py-0.5",
                  isUserMessage &&
                    "border-accent-foreground/30 text-accent-foreground/90",
                )}
              >
                {fileExtension}
              </Badge>
              {secondaryLabel && (
                <span
                  className={cn(
                    "truncate max-w-[10rem]",
                    isUserMessage
                      ? "text-accent-foreground/70"
                      : "text-muted-foreground",
                  )}
                  title={secondaryLabel}
                >
                  {secondaryLabel}
                </span>
              )}
            </div>
          </div>
          {fileUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "size-9 flex-shrink-0 hover:text-foreground",
                    isUserMessage
                      ? "text-accent-foreground/70 hover:text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <a href={fileUrl} download={part.filename ?? filename}>
                    <Download className="size-4" />
                    <span className="sr-only">Download {filename}</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  },
);

FileMessagePart.displayName = "FileMessagePart";

// Source URL (non-model) attachment renderer
export function SourceUrlMessagePart({
  part,
  isUserMessage,
}: {
  part: { type: "source-url"; url: string; title?: string; mediaType?: string };
  isUserMessage: boolean;
}) {
  const name = part.title || part.url?.split("/").pop() || "attachment";
  const ext = name.split(".").pop()?.toUpperCase() || "FILE";
  const mediaType =
    part.mediaType && part.mediaType !== "application/octet-stream"
      ? part.mediaType
      : undefined;
  return (
    <div
      className={cn(
        "max-w-md rounded-2xl border border-border/80 p-4 backdrop-blur-sm shadow-sm",
        isUserMessage
          ? "ml-auto bg-accent text-accent-foreground border-accent/40"
          : "mr-auto bg-muted/60 text-foreground",
      )}
    >
      <div className="flex items-start gap-4 max-w-sm">
        <div
          className={cn(
            "flex-shrink-0 rounded-xl p-3",
            isUserMessage ? "bg-accent-foreground/10" : "bg-muted",
          )}
        >
          <FileIcon
            className={cn(
              "size-6",
              isUserMessage
                ? "text-accent-foreground/80"
                : "text-muted-foreground",
            )}
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1 pr-3">
          <a
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "text-sm font-medium hover:underline line-clamp-1",
              isUserMessage ? "text-accent-foreground" : "text-foreground",
            )}
            title={name}
          >
            {name}
          </a>
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 text-xs",
              isUserMessage
                ? "text-accent-foreground/70"
                : "text-muted-foreground",
            )}
          >
            <Badge
              variant="outline"
              className={cn(
                "uppercase tracking-wide px-2 py-0.5",
                isUserMessage &&
                  "border-accent-foreground/30 text-accent-foreground/90",
              )}
            >
              {ext}
            </Badge>
            {mediaType && (
              <span className="truncate max-w-[10rem]" title={mediaType}>
                {mediaType}
              </span>
            )}
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              size="icon"
              variant="ghost"
              className={cn(
                "size-9 flex-shrink-0 hover:text-foreground",
                isUserMessage
                  ? "text-accent-foreground/70 hover:text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              <a href={part.url} target="_blank" rel="noopener noreferrer">
                <Download className="size-4" />
                <span className="sr-only">Open attachment</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open attachment</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
