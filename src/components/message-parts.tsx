"use client";

import { UIMessage } from "ai";
import {
  Check,
  Copy,
  Loader,
  Pencil,
  ChevronDownIcon,
  RefreshCw,
  X,
  Trash2,
  ChevronRight,
  TriangleAlert,
  XIcon,
  Loader2,
  AlertTriangleIcon,
  Percent,
  GitBranch,
  HammerIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { Button } from "ui/button";
import { Markdown } from "./markdown";
import { cn, isObject, safeJSONParse, toAny, wait } from "lib/utils";
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

import { AnimatePresence, motion } from "framer-motion";
import { SelectModel } from "./select-model";
import {
  branchOutAction,
  deleteMessageAction,
  deleteMessagesByChatIdAfterTimestampAction,
} from "@/app/api/chat/actions";

import { toast } from "sonner";
import { safe } from "ts-safe";
import { ChatModel, ClientToolInvocation } from "app-types/chat";

import { Skeleton } from "ui/skeleton";
import { PieChart } from "./tool-invocation/pie-chart";
import { BarChart } from "./tool-invocation/bar-chart";
import { LineChart } from "./tool-invocation/line-chart";
import { useTranslations } from "next-intl";
import { extractMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { Separator } from "ui/separator";

import { TextShimmer } from "ui/text-shimmer";
import equal from "lib/equal";
import {
  isVercelAIWorkflowTool,
  VercelAIWorkflowToolStreamingResult,
} from "app-types/workflow";
import { NodeIcon } from "./workflow/node-icon";
import { NodeResultPopup } from "./workflow/node-result-popup";

import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { GlobalIcon } from "ui/global-icon";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "ui/hover-card";
import { notify } from "lib/notify";
import { DefaultToolName } from "lib/ai/tools";
import { TavilyResponse } from "lib/ai/tools/web/web-search";

import { CodeBlock } from "ui/CodeBlock";
import { SafeJsExecutionResult, safeJsRun } from "lib/safe-js-run";
import { useRouter } from "next/navigation";

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
  messageId: string;
  showActions: boolean;
  isLast?: boolean;
  isManualToolInvocation?: boolean;
  onPoxyToolCall?: (result: ClientToolInvocation) => void;
  isError?: boolean;
  setMessages?: UseChatHelpers["setMessages"];
}

export const UserMessagePart = memo(function UserMessagePart({
  part,
  isLast,
  status,
  message,
  setMessages,
  reload,
  isError,
}: UserMessagePartProps) {
  const { copied, copy } = useCopy();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isDeleting, setIsDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        data-testid="message-content"
        className={cn(
          "flex flex-col gap-4 max-w-full ring ring-input",
          {
            "bg-accent text-accent-foreground px-4 py-3 rounded-2xl": isLast,
            "opacity-50": isError,
          },
          isError && "border-destructive border",
        )}
      >
        <p className={cn("whitespace-pre-wrap text-sm break-words")}>
          {part.text}
        </p>
      </div>
      {isLast && (
        <div className="flex w-full justify-end opacity-0 group-hover/message:opacity-100 transition-opacity duration-300">
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
                {isDeleting ? <Loader className="animate-spin" /> : <Trash2 />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-destructive" side="bottom">
              Delete Message
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      <div ref={ref} className="min-w-0" />
    </div>
  );
});
UserMessagePart.displayName = "UserMessagePart";

export const AssistMessagePart = memo(function AssistMessagePart({
  part,
  showActions,
  reload,
  message,
  setMessages,
  isError,
  threadId,
}: AssistMessagePartProps) {
  const { copied, copy } = useCopy();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBranching, setIsBranching] = useState(false);

  const router = useRouter();

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

  const handleModelChange = (model: ChatModel) => {
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

  const handleBranchOut = useCallback(async () => {
    safe(() => setIsBranching(true))
      .ifOk(async () => {
        if (!threadId) {
          throw new Error("Thread ID is required");
        }
        const newThread = await branchOutAction(threadId, message.id);
        router.push(`/chat/${newThread.id}`);
      })
      .ifFail((error) => toast.error(error.message))
      .watch(() => setIsBranching(false))
      .unwrap();
  }, [message.id]);

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
                <SelectModel onSelect={handleModelChange}>
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
                disabled={isBranching}
                onClick={handleBranchOut}
                className="size-3! p-4! opacity-0 group-hover/message:opacity-100"
              >
                {isBranching ? (
                  <Loader className="animate-spin" />
                ) : (
                  <GitBranch />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Branch Out</TooltipContent>
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
});
AssistMessagePart.displayName = "AssistMessagePart";

export const ToolMessagePart = memo(
  ({
    part,
    isLast,
    showActions,
    onPoxyToolCall,
    isError,
    messageId,
    setMessages,
    isManualToolInvocation,
  }: ToolMessagePartProps) => {
    const t = useTranslations("");
    const { toolInvocation } = part;
    const { toolName, toolCallId, state, args } = toolInvocation;
    const [expanded, setExpanded] = useState(false);
    const { copied: copiedInput, copy: copyInput } = useCopy();
    const { copied: copiedOutput, copy: copyOutput } = useCopy();
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteMessage = useCallback(() => {
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
    }, [messageId, setMessages]);

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
    }, [toolInvocation, onPoxyToolCall]);

    const CustomToolComponent = useMemo(() => {
      if (
        toolName === DefaultToolName.WebSearch ||
        toolName === DefaultToolName.WebContent
      ) {
        return <SearchToolPart part={toolInvocation} />;
      }

      if (toolName === DefaultToolName.JavascriptExecution) {
        return (
          <SimpleJavascriptExecutionToolPart
            part={toolInvocation}
            onResult={
              onPoxyToolCall
                ? (result) =>
                    onPoxyToolCall?.({
                      action: "direct",
                      result,
                    })
                : undefined
            }
          />
        );
      }

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
    }, [toolName, state, onPoxyToolCall, result, args]);

    const isWorkflowTool = isVercelAIWorkflowTool(result);

    const { serverName: mcpServerName, toolName: mcpToolName } = useMemo(() => {
      return extractMCPToolId(toolName);
    }, [toolName]);

    const isExpanded = useMemo(() => {
      return expanded || result === null || isWorkflowTool;
    }, [expanded, result, isWorkflowTool]);

    const isExecuting = useMemo(() => {
      if (isWorkflowTool) return result?.status == "running";
      return state !== "result" && (isLast || !!onPoxyToolCall);
    }, [isWorkflowTool, result, state, isLast, !!onPoxyToolCall]);

    return (
      <div key={toolCallId} className="group w-full">
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
                    <AvatarImage src={result.workflowIcon?.value} />
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
                        onClick={() =>
                          copyInput(JSON.stringify(toolInvocation.args))
                        }
                      >
                        <Copy className="size-3" />
                      </Button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="p-2 max-h-[300px] overflow-y-auto ">
                      <JsonView data={toolInvocation.args} />
                    </div>
                  )}
                </div>
                {!result ? null : isWorkflowTool ? (
                  <WorkflowToolDetail result={result} />
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

                {onPoxyToolCall && isManualToolInvocation && (
                  <div className="flex flex-row gap-2 items-center mt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full text-xs hover:ring"
                      onClick={() =>
                        onPoxyToolCall({ action: "manual", result: true })
                      }
                    >
                      <Check />
                      {t("Common.approve")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() =>
                        onPoxyToolCall({ action: "manual", result: false })
                      }
                    >
                      <X />
                      {t("Common.reject")}
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
    if (!!prev.onPoxyToolCall !== !!next.onPoxyToolCall) return false;
    if (prev.isManualToolInvocation !== next.isManualToolInvocation)
      return false;
    if (prev.messageId !== next.messageId) return false;
    if (!equal(prev.part.toolInvocation, next.part.toolInvocation))
      return false;
    return true;
  },
);

ToolMessagePart.displayName = "ToolMessagePart";

function SearchToolPart({ part }: { part: ToolMessagePart["toolInvocation"] }) {
  const t = useTranslations();

  const result = useMemo(() => {
    if (part.state != "result") return null;
    return part.result as TavilyResponse & { isError: boolean; error?: string };
  }, [part.state]);
  const [errorSrc, setErrorSrc] = useState<string[]>([]);

  const options = useMemo(() => {
    return (
      <HoverCard openDelay={200} closeDelay={0}>
        <HoverCardTrigger asChild>
          <span className="hover:text-primary transition-colors text-xs text-muted-foreground">
            {t("Chat.Tool.searchOptions")}
          </span>
        </HoverCardTrigger>
        <HoverCardContent className="max-w-xs md:max-w-md! w-full! overflow-auto flex flex-col">
          <p className="text-xs text-muted-foreground px-2 mb-2">
            {t("Chat.Tool.searchOptionsDescription")}
          </p>
          <div className="p-2">
            <JsonView data={part.args} />
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }, [part.args]);

  const onError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (errorSrc.includes(target.src)) return;
    setErrorSrc([...errorSrc, target.src]);
  };

  const images = useMemo(() => {
    return (
      result?.images?.filter((image) => !errorSrc.includes(image.url)) ?? []
    );
  }, [result?.images, errorSrc]);

  if (part.state != "result")
    return (
      <div className="flex items-center gap-2 text-sm">
        <GlobalIcon className="size-5 wiggle text-muted-foreground" />
        <TextShimmer>{t("Chat.Tool.webSearching")}</TextShimmer>
      </div>
    );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <GlobalIcon className="size-5 text-muted-foreground" />
        <span className="text-sm font-semibold">
          {t("Chat.Tool.searchedTheWeb")}
        </span>
        {options}
      </div>
      <div className="flex gap-2">
        <div className="px-2.5">
          <Separator
            orientation="vertical"
            className="bg-gradient-to-b from-border to-transparent from-80%"
          />
        </div>
        <div className="flex flex-col gap-2 pb-2">
          {images?.length && (
            <div className="grid grid-cols-3 gap-3 max-w-2xl">
              {images.map((image, i) => {
                if (!image.url) return null;
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        key={image.url}
                        onClick={() => {
                          notify.component({
                            className: "max-w-[90vw]! max-h-[90vh]! p-6!",
                            children: (
                              <div className="flex flex-col h-full gap-4">
                                <div className="flex-1 flex items-center justify-center min-h-0 py-6">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={image.url}
                                    className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg"
                                    alt={image.description}
                                    onError={onError}
                                  />
                                </div>
                              </div>
                            ),
                          });
                        }}
                        className="block shadow rounded-lg overflow-hidden ring ring-input cursor-pointer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          loading="lazy"
                          src={image.url}
                          alt={image.description}
                          className="w-full h-36 object-cover hover:scale-120 transition-transform duration-300"
                          onError={onError}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="p-4 max-w-xs whitespace-pre-wrap break-words">
                      <p className="text-xs text-muted-foreground">
                        {image.description || image.url}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {result?.isError ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangleIcon className="size-3.5" />
                {result.error || "Error"}
              </p>
            ) : (
              (result as TavilyResponse)?.results?.map((result, i) => {
                return (
                  <HoverCard key={i} openDelay={200} closeDelay={0}>
                    <HoverCardTrigger asChild>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group rounded-full bg-secondary pl-1.5 pr-2 py-1.5 text-xs flex items-center gap-1 hover:bg-input hover:ring hover:ring-blue-500 transition-all cursor-pointer"
                      >
                        <div className="rounded-full bg-input ring ring-input">
                          <Avatar className="size-3 rounded-full">
                            <AvatarImage src={result.favicon} />
                            <AvatarFallback>
                              {result.title?.slice(0, 1).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="truncate max-w-44">{result.url}</span>
                      </a>
                    </HoverCardTrigger>

                    <HoverCardContent className="flex flex-col gap-1 p-6">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full ring ring-input">
                          <Avatar className="size-6 rounded-full">
                            <AvatarImage src={result.favicon} />
                            <AvatarFallback>
                              {result.title?.slice(0, 1).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <span
                          className={cn(
                            "font-medium",
                            !result.title && "truncate",
                          )}
                        >
                          {result.title || result.url}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mt-4">
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-card from-80% " />
                          <p className="text-xs text-muted-foreground max-h-60 overflow-y-auto">
                            {result.content || result.raw_content}
                          </p>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })
            )}
          </div>
          {result?.results?.length && (
            <p className="text-xs text-muted-foreground ml-1 flex items-center gap-1">
              {t("Common.resultsFound", {
                count: result?.results?.length,
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const ReasoningPart = memo(function ReasoningPart({
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
});
ReasoningPart.displayName = "ReasoningPart";

export function WorkflowToolDetail({
  result,
}: { result: VercelAIWorkflowToolStreamingResult }) {
  const { copied, copy } = useCopy();
  const savedResult = useRef<VercelAIWorkflowToolStreamingResult>(result);
  const output = useMemo(() => {
    if (result.status == "running") return null;
    if (result.status == "fail")
      return (
        <Alert variant={"destructive"} className="border-destructive">
          <AlertTriangleIcon className="size-3" />
          <AlertTitle>{result?.error?.name || "ERROR"}</AlertTitle>
          <AlertDescription>{result.error?.message}</AlertDescription>
        </Alert>
      );
    if (!result.result) return null;

    return (
      <div className="w-full bg-card p-4 border text-xs rounded-lg text-muted-foreground">
        <div className="flex items-center">
          <h5 className="text-muted-foreground font-medium select-none">
            Response
          </h5>
          <div className="flex-1" />
          {copied ? (
            <Check className="size-3" />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-3 text-muted-foreground"
              onClick={() => copy(JSON.stringify(result.result))}
            >
              <Copy className="size-3" />
            </Button>
          )}
        </div>
        <div className="p-2 max-h-[300px] overflow-y-auto">
          <JsonView data={result.result} />
        </div>
      </div>
    );
  }, [result.status, result.error, result.result, copied]);
  useEffect(() => {
    if (result.status == "running") {
      savedResult.current = result;
    }
  }, [result]);

  return (
    <div className="w-full flex flex-col gap-1">
      {result.history.map((item, i) => {
        const result = item.result || savedResult.current.history[i]?.result;
        return (
          <NodeResultPopup
            key={item.id}
            disabled={!result}
            history={{
              name: item.name,
              status: item.status,
              startedAt: item.startedAt,
              endedAt: item.endedAt,
              error: item.error?.message,
              result,
            }}
          >
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 text-sm rounded-sm px-2 py-1.5 relative",
                item.status == "fail" && "text-destructive",
                !!result && "cursor-pointer hover:bg-secondary",
              )}
            >
              <div className="border rounded overflow-hidden">
                <NodeIcon
                  type={item.kind}
                  iconClassName="size-3"
                  className="rounded-none"
                />
              </div>
              {item.status == "running" ? (
                <TextShimmer className="font-semibold">
                  {`${item.name} Running...`}
                </TextShimmer>
              ) : (
                <span className="font-semibold">{item.name}</span>
              )}
              <span
                className={cn(
                  "ml-auto text-xs",
                  item.status != "fail" && "text-muted-foreground",
                )}
              >
                {item.status != "running" &&
                  ((item.endedAt! - item.startedAt!) / 1000).toFixed(2)}
              </span>
              {item.status == "success" ? (
                <Check className="size-3" />
              ) : item.status == "fail" ? (
                <XIcon className="size-3" />
              ) : (
                <Loader2 className="size-3 animate-spin" />
              )}
            </div>
          </NodeResultPopup>
        );
      })}
      <div className="mt-2">{output}</div>
    </div>
  );
}

export const SimpleJavascriptExecutionToolPart = memo(
  function SimpleJavascriptExecutionToolPart({
    part,
    onResult,
  }: {
    part: ToolMessagePart["toolInvocation"];
    onResult?: (result?: any) => void;
  }) {
    const isRun = useRef(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const runCode = useCallback(
      async (code: string, input: any, timeout?: number) => {
        await wait(2000);
        const result = await safeJsRun(code, input, timeout);
        onResult?.({
          ...toAny(result),
          guide:
            "The code has already been executed and displayed to the user. Please provide only the output results from console.log() or error details if any occurred. Do not repeat the code itself.",
        });
      },
      [onResult],
    );

    const scrollToCode = useCallback(() => {
      scrollContainerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }, []);

    useEffect(() => {
      if (onResult && part.args && part.state == "call" && !isRun.current) {
        isRun.current = true;
        runCode(part.args.code, part.args.input, part.args.timeout);
      }
    }, [part.state, !!onResult]);

    useEffect(() => {
      if (part.state != "result") {
        const closeKey = setInterval(scrollToCode, 300);
        return () => clearInterval(closeKey);
      } else {
        scrollToCode();
      }
    }, [part.state]);

    const result = useMemo(() => {
      if (part.state != "result") return null;
      return part.result as SafeJsExecutionResult;
    }, [part]);

    const logs = useMemo(() => {
      const error = result?.error;
      const logs = result?.logs || [];

      if (error) {
        return [{ type: "error", args: [error] }, ...logs];
      }

      return logs;
    }, [part]);

    return (
      <div className="flex flex-col">
        <div className="px-6 py-3">
          {!!part.args?.code && (
            <div className="border relative rounded-lg overflow-hidden bg-background shadow fade-in animate-in duration-500">
              <div className="py-2.5 px-4 flex items-center gap-1.5 z-20 border-b bg-background min-h-[37px]">
                {part.state != "result" ? (
                  <>
                    <Loader className="size-3 animate-spin text-muted-foreground" />
                    <TextShimmer className="text-xs">
                      Generating Code...
                    </TextShimmer>
                  </>
                ) : (
                  <>
                    {result?.error ? (
                      <>
                        <AlertTriangleIcon className="size-3 text-destructive" />
                        <span className="text-destructive text-xs">ERROR</span>
                      </>
                    ) : (
                      <>
                        <div className="text-[7px] bg-border rounded-xs w-4 h-4 p-0.5 flex items-end justify-end font-bold">
                          JS
                        </div>
                      </>
                    )}
                  </>
                )}
                <div className="flex-1" />
                <div className="w-1.5 h-1.5 rounded-full bg-input" />
                <div className="w-1.5 h-1.5 rounded-full bg-input" />
                <div className="w-1.5 h-1.5 rounded-full bg-input" />
              </div>
              <div className="relative">
                <div
                  className={`z-10 absolute inset-0 w-full h-1/4 bg-gradient-to-b to-90%  from-background to-transparent ${part.state != "result" ? "" : "h-1/8 pointer-events-none"}`}
                />
                <div
                  className={`z-10 absolute inset-0 w-1/4 h-full bg-gradient-to-r from-background to-transparent ${part.state != "result" ? "" : "w-1/8 pointer-events-none"}`}
                />
                <div
                  className={`z-10 absolute left-0 bottom-0 w-full h-1/4 bg-gradient-to-t from-background to-transparent ${part.state != "result" ? "" : "h-1/8 pointer-events-none"}`}
                />
                <div
                  className={`z-10 absolute right-0 bottom-0 w-1/4 h-full bg-gradient-to-l from-background to-transparent ${part.state != "result" ? "" : "w-1/8 pointer-events-none"}`}
                />

                <div
                  className={`min-h-14 p-6 text-xs overflow-y-auto transition-height duration-1000 max-h-60`}
                >
                  <div>
                    <CodeBlock
                      className="bg-background p-4 text-[10px]"
                      code={part.args?.code}
                      lang="javascript"
                      fallback={<CodeFallback />}
                    />
                    <div ref={scrollContainerRef} />
                  </div>
                </div>
              </div>
              {logs.length > 0 && (
                <div className="p-4 text-[10px] text-foreground flex flex-col gap-1">
                  <div className="text-foreground flex items-center gap-1">
                    <div className="w-1 h-1 mr-1 ring ring-border rounded-full" />{" "}
                    better-chatbot
                    <Percent className="size-2" />
                  </div>
                  {logs.map((log, i) => {
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-1 text-muted-foreground pl-3",
                          log.type == "error" && "text-destructive",
                          log.type == "warn" && "text-yellow-500",
                        )}
                      >
                        <div className="h-[15px] flex items-center pr-2">
                          {log.type == "error" ? (
                            <AlertTriangleIcon className="size-2" />
                          ) : log.type == "warn" ? (
                            <AlertTriangleIcon className="size-2" />
                          ) : (
                            <ChevronRight className="size-2" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {log.args
                            .map((arg) =>
                              isObject(arg)
                                ? JSON.stringify(arg)
                                : arg.toString(),
                            )
                            .join(" ")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

function CodeFallback() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-1/6" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}
