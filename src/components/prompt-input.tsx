"use client";

import {
  AudioWaveformIcon,
  ChevronDown,
  CornerRightUp,
  FileIcon,
  FileTextIcon,
  ImagesIcon,
  Loader2,
  PaperclipIcon,
  PlusIcon,
  Square,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "ui/button";
import { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { SelectModel } from "./select-model";
import { appStore, UploadedFile } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { ChatMention, ChatModel } from "app-types/chat";
import dynamic from "next/dynamic";
import { ToolModeDropdown } from "./tool-mode-dropdown";

import { ToolSelectDropdown } from "./tool-select-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { useTranslations } from "next-intl";
import { Editor } from "@tiptap/react";
import { WorkflowSummary } from "app-types/workflow";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import equal from "lib/equal";
import { MCPIcon } from "ui/mcp-icon";
import { DefaultToolName } from "lib/ai/tools";
import { DefaultToolIcon } from "./default-tool-icon";
import { OpenAIIcon } from "ui/openai-icon";
import { GrokIcon } from "ui/grok-icon";
import { ClaudeIcon } from "ui/claude-icon";
import { GeminiIcon } from "ui/gemini-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useThreadFileUploader } from "@/hooks/use-thread-file-uploader";

import { EMOJI_DATA } from "lib/const";
import { AgentSummary } from "app-types/agent";
import { FileUIPart, TextUIPart } from "ai";
import { toast } from "sonner";
import { isFilePartSupported, isIngestSupported } from "@/lib/ai/file-support";
import { useChatModels } from "@/hooks/queries/use-chat-models";

interface PromptInputProps {
  placeholder?: string;
  setInput: (value: string) => void;
  input: string;
  onStop: () => void;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  toolDisabled?: boolean;
  isLoading?: boolean;
  model?: ChatModel;
  setModel?: (model: ChatModel) => void;
  voiceDisabled?: boolean;
  threadId?: string;
  disabledMention?: boolean;
  onFocus?: () => void;
}

const ChatMentionInput = dynamic(() => import("./chat-mention-input"), {
  ssr: false,
  loading() {
    return <div className="h-[2rem] w-full animate-pulse"></div>;
  },
});

export default function PromptInput({
  placeholder,
  sendMessage,
  model,
  setModel,
  input,
  onFocus,
  setInput,
  onStop,
  isLoading,
  toolDisabled,
  voiceDisabled,
  threadId,
  disabledMention,
}: PromptInputProps) {
  const t = useTranslations("Chat");
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles } = useThreadFileUploader(threadId);
  const { data: providers } = useChatModels();

  const [
    globalModel,
    threadMentions,
    threadFiles,
    threadImageToolModel,
    appStoreMutate,
  ] = appStore(
    useShallow((state) => [
      state.chatModel,
      state.threadMentions,
      state.threadFiles,
      state.threadImageToolModel,
      state.mutate,
    ]),
  );

  const modelInfo = useMemo(() => {
    const provider = providers?.find(
      (provider) => provider.provider === globalModel?.provider,
    );
    const model = provider?.models.find(
      (model) => model.name === globalModel?.model,
    );
    return model;
  }, [providers, globalModel]);

  const supportedFileMimeTypes = modelInfo?.supportedFileMimeTypes;
  const canUploadImages =
    supportedFileMimeTypes?.some((mime) => mime.startsWith("image/")) ?? true;

  const mentions = useMemo<ChatMention[]>(() => {
    if (!threadId) return [];
    return threadMentions[threadId!] ?? [];
  }, [threadMentions, threadId]);

  const uploadedFiles = useMemo<UploadedFile[]>(() => {
    if (!threadId) return [];
    return threadFiles[threadId] ?? [];
  }, [threadFiles, threadId]);

  const imageToolModel = useMemo(() => {
    if (!threadId) return undefined;
    return threadImageToolModel[threadId];
  }, [threadImageToolModel, threadId]);

  const chatModel = useMemo(() => {
    return model ?? globalModel;
  }, [model, globalModel]);

  const editorRef = useRef<Editor | null>(null);

  const setChatModel = useCallback(
    (model: ChatModel) => {
      if (setModel) {
        setModel(model);
      } else {
        appStoreMutate({ chatModel: model });
      }
    },
    [setModel, appStoreMutate],
  );

  const deleteMention = useCallback(
    (mention: ChatMention) => {
      if (!threadId) return;
      appStoreMutate((prev) => {
        const newMentions = mentions.filter((m) => !equal(m, mention));
        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: newMentions,
          },
        };
      });
    },
    [mentions, threadId],
  );

  const deleteFile = useCallback(
    (fileId: string) => {
      if (!threadId) return;

      // Find file and abort if uploading
      const file = uploadedFiles.find((f) => f.id === fileId);
      if (file?.isUploading && file.abortController) {
        file.abortController.abort();
      }

      // Cleanup preview URL if exists
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }

      appStoreMutate((prev) => {
        const newFiles = uploadedFiles.filter((f) => f.id !== fileId);
        return {
          threadFiles: {
            ...prev.threadFiles,
            [threadId]: newFiles,
          },
        };
      });
    },
    [uploadedFiles, threadId, appStoreMutate],
  );

  // uploadFiles handled by hook

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list) return;
      await uploadFiles(Array.from(list));
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploadDropdownOpen(false);
    },
    [uploadFiles],
  );

  const handleGenerateImage = useCallback(
    (provider?: "google" | "openai") => {
      if (!provider) {
        appStoreMutate({
          threadImageToolModel: {},
        });
      }
      if (!threadId) return;

      setIsUploadDropdownOpen(false);

      appStoreMutate((prev) => ({
        threadImageToolModel: {
          ...prev.threadImageToolModel,
          [threadId]: provider,
        },
      }));

      // Focus on the input
      editorRef.current?.commands.focus();
    },
    [threadId, editorRef],
  );

  const addMention = useCallback(
    (mention: ChatMention) => {
      if (!threadId) return;
      appStoreMutate((prev) => {
        if (mentions.some((m) => equal(m, mention))) return prev;

        const newMentions =
          mention.type == "agent"
            ? [...mentions.filter((m) => m.type !== "agent"), mention]
            : [...mentions, mention];

        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: newMentions,
          },
        };
      });
    },
    [mentions, threadId],
  );

  const onSelectWorkflow = useCallback(
    (workflow: WorkflowSummary) => {
      addMention({
        type: "workflow",
        name: workflow.name,
        icon: workflow.icon,
        workflowId: workflow.id,
        description: workflow.description,
      });
    },
    [addMention],
  );

  const onSelectAgent = useCallback(
    (agent: AgentSummary) => {
      appStoreMutate((prev) => {
        return {
          threadMentions: {
            ...prev.threadMentions,
            [threadId!]: [
              {
                type: "agent",
                name: agent.name,
                icon: agent.icon,
                description: agent.description,
                agentId: agent.id,
              },
            ],
          },
        };
      });
    },
    [mentions, threadId],
  );

  const onChangeMention = useCallback(
    (mentions: ChatMention[]) => {
      let hasAgent = false;
      [...mentions]
        .reverse()
        .filter((m) => {
          if (m.type == "agent") {
            if (hasAgent) return false;
            hasAgent = true;
          }

          return true;
        })
        .reverse()
        .forEach(addMention);
    },
    [addMention],
  );

  const submit = () => {
    if (isLoading) return;
    if (uploadedFiles.some((file) => file.isUploading)) {
      toast.error("Please wait for files to finish uploading before sending.");
      return;
    }
    const userMessage = input?.trim() || "";
    if (userMessage.length === 0) return;

    setInput("");
    const attachmentParts = uploadedFiles.reduce<
      Array<FileUIPart | TextUIPart | any>
    >((acc, file) => {
      const isFileSupported = isFilePartSupported(
        file.mimeType,
        supportedFileMimeTypes,
      );
      const link = file.url || file.dataUrl || "";
      if (!link) return acc;
      if (isFileSupported) {
        acc.push({
          type: "file",
          url: link,
          mediaType: file.mimeType,
          filename: file.name,
        } as FileUIPart);
      } else {
        // Use a rich UI part for unsupported file types; will be filtered out for model input
        acc.push({
          type: "source-url",
          url: link,
          title: file.name,
          mediaType: file.mimeType,
        } as any);
      }
      return acc;
    }, []);

    if (attachmentParts.length) {
      const summary = uploadedFiles
        .map((file, index) => {
          const type = file.mimeType || "unknown";
          return `${index + 1}. ${file.name} (${type})`;
        })
        .join("\n");

      attachmentParts.unshift({
        type: "text",
        text: `Attached files:\n${summary}`,
        ingestionPreview: true,
      });
    }

    sendMessage({
      role: "user",
      parts: [...attachmentParts, { type: "text", text: userMessage }],
    });
    appStoreMutate((prev) => ({
      threadFiles: {
        ...prev.threadFiles,
        [threadId!]: [],
      },
    }));
  };

  // Handle ESC key to clear mentions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        threadId &&
        (mentions.length > 0 || imageToolModel)
      ) {
        e.preventDefault();
        e.stopPropagation();
        appStoreMutate(() => ({
          threadMentions: {},
          agentId: undefined,
          threadImageToolModel: {},
        }));
        editorRef.current?.commands.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mentions.length, threadId, appStoreMutate, imageToolModel]);

  // Drag overlay handled globally in ChatBot

  return (
    <div className="max-w-3xl mx-auto fade-in animate-in">
      <div className="z-10 mx-auto w-full max-w-3xl relative">
        <fieldset className="flex w-full min-w-0 max-w-full flex-col px-4">
          <div className="shadow-lg overflow-hidden rounded-4xl backdrop-blur-sm transition-all duration-200 bg-muted/60 relative flex w-full flex-col cursor-text z-10 items-stretch focus-within:bg-muted hover:bg-muted focus-within:ring-muted hover:ring-muted">
            {mentions.length > 0 && (
              <div className="bg-input rounded-b-sm rounded-t-3xl p-3 flex flex-col gap-4 mx-2 my-2">
                {mentions.map((mention, i) => {
                  return (
                    <div key={i} className="flex items-center gap-2">
                      {mention.type === "workflow" ||
                      mention.type === "agent" ? (
                        <Avatar
                          className="size-6 p-1 ring ring-border rounded-full flex-shrink-0"
                          style={mention.icon?.style}
                        >
                          <AvatarImage
                            src={
                              mention.icon?.value ||
                              EMOJI_DATA[i % EMOJI_DATA.length]
                            }
                          />
                          <AvatarFallback>
                            {mention.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Button className="size-6 flex items-center justify-center ring ring-border rounded-full flex-shrink-0 p-0.5">
                          {mention.type == "mcpServer" ? (
                            <MCPIcon className="size-3.5" />
                          ) : (
                            <DefaultToolIcon
                              name={mention.name as DefaultToolName}
                              className="size-3.5"
                            />
                          )}
                        </Button>
                      )}

                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-semibold truncate">
                          {mention.name}
                        </span>
                        {mention.description ? (
                          <span className="text-muted-foreground text-xs truncate">
                            {mention.description}
                          </span>
                        ) : null}
                      </div>
                      <Button
                        variant={"ghost"}
                        size={"icon"}
                        disabled={!threadId}
                        className="rounded-full hover:bg-input! flex-shrink-0"
                        onClick={() => {
                          deleteMention(mention);
                        }}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-col gap-3.5 px-5 pt-2 pb-4">
              <div className="relative min-h-[2rem]">
                <ChatMentionInput
                  input={input}
                  onChange={setInput}
                  onChangeMention={onChangeMention}
                  onEnter={submit}
                  placeholder={placeholder ?? t("placeholder")}
                  ref={editorRef}
                  disabledMention={disabledMention}
                  onFocus={onFocus}
                />
              </div>
              <div className="flex w-full items-center z-30">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.tar,.gz,.mp3,.wav,.m4a,.ogg,.mp4,.webm,.mov"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={!threadId}
                />

                <DropdownMenu
                  open={isUploadDropdownOpen}
                  onOpenChange={setIsUploadDropdownOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={"ghost"}
                      size={"sm"}
                      className="rounded-full hover:bg-input! p-2! data-[state=open]:bg-input!"
                      disabled={!threadId}
                    >
                      <PlusIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      disabled={
                        modelInfo?.isImageInputUnsupported || !canUploadImages
                      }
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <PaperclipIcon className="mr-2 size-4" />
                      {t("uploadImage")}
                    </DropdownMenuItem>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <ImagesIcon className="mr-4 size-4 text-muted-foreground" />
                        <span className="mr-4">{t("generateImage")}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem
                            disabled={modelInfo?.isToolCallUnsupported}
                            onClick={() => handleGenerateImage("google")}
                            className="cursor-pointer"
                          >
                            <GeminiIcon className="mr-2 size-4" />
                            Gemini (Nano Banana)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={modelInfo?.isToolCallUnsupported}
                            onClick={() => handleGenerateImage("openai")}
                            className="cursor-pointer"
                          >
                            <OpenAIIcon className="mr-2 size-4" />
                            OpenAI
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>

                {!toolDisabled &&
                  (imageToolModel ? (
                    <Button
                      variant={"ghost"}
                      size={"sm"}
                      className="rounded-full hover:bg-input! p-2! group/image-generator text-primary"
                      onClick={() => handleGenerateImage()}
                    >
                      <ImagesIcon className="size-3.5" />
                      {t("generateImage")}
                      <XIcon className="size-3 group-hover/image-generator:opacity-100 opacity-0 transition-opacity duration-200" />
                    </Button>
                  ) : (
                    <>
                      <ToolModeDropdown />
                      <ToolSelectDropdown
                        className="mx-1"
                        align="start"
                        side="top"
                        onSelectWorkflow={onSelectWorkflow}
                        onSelectAgent={onSelectAgent}
                        onGenerateImage={handleGenerateImage}
                        mentions={mentions}
                      />
                    </>
                  ))}

                <div className="flex-1" />

                <SelectModel onSelect={setChatModel} currentModel={chatModel}>
                  <Button
                    variant={"ghost"}
                    size={"sm"}
                    className="rounded-full group data-[state=open]:bg-input! hover:bg-input! mr-1"
                    data-testid="model-selector-button"
                  >
                    {chatModel?.model ? (
                      <>
                        {chatModel.provider === "openai" ? (
                          <OpenAIIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : chatModel.provider === "xai" ? (
                          <GrokIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : chatModel.provider === "anthropic" ? (
                          <ClaudeIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : chatModel.provider === "google" ? (
                          <GeminiIcon className="size-3 opacity-0 group-data-[state=open]:opacity-100 group-hover:opacity-100" />
                        ) : null}
                        <span
                          className="text-foreground group-data-[state=open]:text-foreground  "
                          data-testid="selected-model-name"
                        >
                          {chatModel.model}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">model</span>
                    )}

                    <ChevronDown className="size-3" />
                  </Button>
                </SelectModel>
                {!isLoading && !input.length && !voiceDisabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size={"sm"}
                        onClick={() => {
                          appStoreMutate((state) => ({
                            voiceChat: {
                              ...state.voiceChat,
                              isOpen: true,
                              agentId: undefined,
                            },
                          }));
                        }}
                        className="rounded-full p-2!"
                      >
                        <AudioWaveformIcon size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("VoiceChat.title")}</TooltipContent>
                  </Tooltip>
                ) : (
                  <div
                    onClick={() => {
                      if (isLoading) {
                        onStop();
                      } else {
                        submit();
                      }
                    }}
                    className="fade-in animate-in cursor-pointer text-muted-foreground rounded-full p-2 bg-secondary hover:bg-accent-foreground hover:text-accent transition-all duration-200"
                  >
                    {isLoading ? (
                      <Square
                        size={16}
                        className="fill-muted-foreground text-muted-foreground"
                      />
                    ) : (
                      <CornerRightUp size={16} />
                    )}
                  </div>
                )}
              </div>

              {/* Uploaded Files Preview - Below Input */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file) => {
                    const isImage = file.mimeType.startsWith("image/");
                    const imageSrc =
                      file.previewUrl || file.url || file.dataUrl || "";
                    const displayName = file.name;
                    const displayExt =
                      file.name.split(".").pop()?.toUpperCase() || "FILE";
                    const isSummarizable = isIngestSupported(file.mimeType);
                    return (
                      <div
                        key={file.id}
                        className="relative group rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all"
                      >
                        {isImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={imageSrc}
                            alt={file.name}
                            className="w-24 h-24 object-cover"
                          />
                        ) : (
                          <div className="w-32 h-28 flex flex-col items-center justify-center bg-muted px-2 py-3 text-center">
                            <FileIcon className="size-8 text-muted-foreground mb-1" />
                            <span className="text-xs font-medium text-muted-foreground line-clamp-2 w-full">
                              {displayName}
                            </span>
                            <span className="text-[11px] text-muted-foreground/80">
                              {displayExt}
                            </span>
                          </div>
                        )}

                        {/* Upload Progress Overlay */}
                        {file.isUploading && (
                          <div className="absolute inset-0 bg-background/90 flex rounded-lg flex-col items-center justify-center backdrop-blur-sm">
                            <Loader2 className="size-6 animate-spin text-foreground mb-2" />
                            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${file.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-foreground text-xs mt-1">
                              {file.progress || 0}%
                            </span>
                          </div>
                        )}

                        {/* Hover Actions */}
                        <div
                          className={cn(
                            "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity flex items-center justify-center rounded-lg",
                            file.isUploading
                              ? "opacity-0"
                              : "opacity-0 group-hover:opacity-100",
                          )}
                        >
                          <div className="flex gap-2 items-center">
                            {isSummarizable && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="rounded-full"
                                    onClick={async () => {
                                      try {
                                        const url = file.url || file.dataUrl;
                                        if (!url) {
                                          toast.error("No file URL available");
                                          return;
                                        }
                                        const res = await fetch(
                                          "/api/storage/ingest",
                                          {
                                            method: "POST",
                                            headers: {
                                              "Content-Type":
                                                "application/json",
                                            },
                                            body: JSON.stringify({ url }),
                                          },
                                        );
                                        if (!res.ok) {
                                          const e = await res
                                            .json()
                                            .catch(() => ({}));
                                          toast.error(
                                            e.error || "Failed to ingest file",
                                          );
                                          return;
                                        }
                                        const data = await res.json();
                                        // Append preview text to input for the user to send
                                        setInput(
                                          `${input ? input + "\n\n" : ""}${data.text}`,
                                        );
                                      } catch (_err) {
                                        toast.error("Failed to ingest file");
                                      }
                                    }}
                                  >
                                    <FileTextIcon className="size-4" />
                                    <span className="sr-only">Summarize</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Summarize</TooltipContent>
                              </Tooltip>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full bg-background/80 hover:bg-background"
                              onClick={() => deleteFile(file.id)}
                              disabled={file.isUploading}
                            >
                              <XIcon className="size-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Cancel Upload Button (Top Right) */}
                        {file.isUploading && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 size-6 rounded-full bg-background/60 hover:bg-background/80 backdrop-blur-sm"
                            onClick={() => deleteFile(file.id)}
                          >
                            <XIcon className="size-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
