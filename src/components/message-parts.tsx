"use client";

import { Button } from "@/components/ui/button";
import JsonView from "@/components/ui/json-view";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";
import type { UseChatHelpers } from "@ai-sdk/react";
import { UIMessage } from "ai";
import {
  BookMarked,
  Check,
  ChevronDown,
  ChevronDownIcon,
  Copy,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { AddToLibraryDialog } from "./library";
import { Markdown } from "./markdown";
import { MessageEditor } from "./message-editor";
import { PastesContentCard } from "./pasts-content";

import { deleteMessagesByChatIdAfterTimestampAction } from "@/app/api/chat/actions";
import { Card, CardContent } from "@/components/ui/card";
import { customModelProvider } from "@/lib/ai/models";
import { AnimatePresence, motion } from "framer-motion";
import { FileAttachmentView } from "./file-attachment-view";
import { SelectModel } from "./select-model";

import { toast } from "sonner";
import { safe } from "ts-safe";

type MessagePart = UIMessage["parts"][number];

type TextMessagePart = Extract<MessagePart, { type: "text" }>;
type AssistMessagePart = Extract<MessagePart, { type: "text" }>;
type ToolMessagePart = Extract<MessagePart, { type: "tool-invocation" }>;
type FileAttachmentMessagePart = Extract<
  MessagePart,
  { type: "file-attachment" }
>;

interface UserMessagePartProps {
  part: TextMessagePart;
  isLast: boolean;
  message: UIMessage;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
  append?: UseChatHelpers["append"];
}

interface AssistMessagePartProps {
  part: AssistMessagePart;
  message: UIMessage;
  isLast: boolean;
  threadId: string;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
}

interface ToolMessagePartProps {
  part: ToolMessagePart;
}

interface FileAttachmentMessagePartProps {
  part: FileAttachmentMessagePart;
}

export const UserMessagePart = ({
  part,
  isLast,
  message,
  setMessages,
  reload,
  append,
}: UserMessagePartProps) => {
  const { copied, copy } = useCopy();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isResending, setIsResending] = useState(false);
  const [isLibraryDialogOpen, setIsLibraryDialogOpen] = useState(false);

  const handleResend = async () => {
    try {
      setIsResending(true);

      // Create a new message with the same content
      if (append) {
        await append({
          role: "user",
          content: "",
          parts: message.parts,
        });
      } else {
        toast.error("Cannot resend message: append function not available");
      }
    } catch (error) {
      toast.error("Failed to resend message");
      console.error("Failed to resend message:", error);
    } finally {
      setIsResending(false);
    }
  };

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
        className={cn("flex flex-col gap-4", {
          "bg-primary text-primary-foreground px-3 py-2 rounded-xl": isLast,
        })}
      >
        {isLast ? (
          <p className="whitespace-pre-wrap text-sm">{part.text}</p>
        ) : (
          <PastesContentCard initialContent={part.text} readonly />
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
                  data-testid="message-copy-button"
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
                  data-testid="message-save-to-library-button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-3! p-4! opacity-0 group-hover/message:opacity-100",
                  )}
                  onClick={() => setIsLibraryDialogOpen(true)}
                >
                  <BookMarked className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Save to Library</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="message-resend-button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-3! p-4! opacity-0 group-hover/message:opacity-100",
                  )}
                  onClick={handleResend}
                  disabled={isResending}
                >
                  {isResending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RotateCcw />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Resend</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      <AddToLibraryDialog
        isOpen={isLibraryDialogOpen}
        onClose={() => setIsLibraryDialogOpen(false)}
        content={part.text}
        source={message.id}
        sourceType="chat"
      />
    </div>
  );
};

const modelList = customModelProvider.modelsInfo;

export const AssistMessagePart = ({
  part,
  isLast,
  reload,
  message,
  setMessages,
  threadId,
}: AssistMessagePartProps) => {
  const { copied, copy } = useCopy();
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<string>("claude-3-5-sonnet");
  const [isLibraryDialogOpen, setIsLibraryDialogOpen] = useState(false);

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    safe(() => setIsLoading(true))
      .ifOk(() => deleteMessagesByChatIdAfterTimestampAction(message.id))
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
            model: newModel,
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
      <div data-testid="message-content" className="flex flex-col gap-4">
        <Markdown>{part.text}</Markdown>
      </div>
      {isLast && (
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
              <Button
                data-testid="message-save-to-library-button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-3! p-4! opacity-0 group-hover/message:opacity-100",
                )}
                onClick={() => setIsLibraryDialogOpen(true)}
              >
                <BookMarked className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save to Library</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SelectModel
                  model={model || "claude-3-5-sonnet"}
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
        </div>
      )}

      <AddToLibraryDialog
        isOpen={isLibraryDialogOpen}
        onClose={() => setIsLibraryDialogOpen(false)}
        content={part.text}
        source={message.id}
        sourceType="chat"
      />
    </div>
  );
};

export const ToolMessagePart = ({ part }: ToolMessagePartProps) => {
  const { toolInvocation } = part;
  const { toolName, toolCallId, state } = toolInvocation;
  const [isExpanded, setIsExpanded] = useState(false);

  const isLoading = state !== "result";
  return (
    <div key={toolCallId} className="flex flex-col gap-2 group">
      <div
        className="flex flex-row gap-2 items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Button
          variant="outline"
          className={cn(
            "flex flex-row gap-2 justify-between items-center text-muted-foreground min-w-44",
            isLoading && "animate-pulse",
          )}
        >
          <p className={cn("font-bold")}>{toolName}</p>
          {isLoading ? (
            <Loader2 className="size-3 animate-spin" />
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
      </div>
      {isExpanded && (
        <Card className="relative mt-2 p-4 max-h-[50vh] overflow-y-auto bg-background">
          <CardContent className="flex flex-row gap-4 text-sm ">
            <div className="w-1/2 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 mb-2 pt-2 pb-1 bg-background z-10">
                <h5 className="text-muted-foreground text-sm font-medium">
                  Inputs
                </h5>
              </div>
              <JsonView data={toolInvocation.args} />
            </div>

            <div className="w-1/2 min-w-0 pl-4 flex flex-col">
              <div className="flex items-center gap-2 mb-4 pt-2 pb-1 bg-background z-10">
                <h5 className="text-muted-foreground text-sm font-medium">
                  Outputs
                </h5>
              </div>
              <JsonView
                data={
                  toolInvocation.state === "result"
                    ? toolInvocation.result
                    : null
                }
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export const FileAttachmentMessagePart = ({
  part,
}: FileAttachmentMessagePartProps) => {
  const { file_attachment } = part;

  return (
    <div className="flex flex-col gap-2 my-2">
      <FileAttachmentView
        attachments={[
          {
            id: file_attachment.id,
            filename: file_attachment.filename,
            originalFilename: file_attachment.filename,
            mimetype: file_attachment.mimetype,
            url: file_attachment.url,
            thumbnailUrl: file_attachment.thumbnailUrl,
          },
        ]}
      />
    </div>
  );
};

export function ReasoningPart({
  reasoning,
  isThinking,
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
      {isThinking && (
        <motion.div
          className="h-2 w-2 rounded-full bg-primary mt-4"
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
      )}
    </div>
  );
}
