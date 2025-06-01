"use client";

import {
  AudioWaveformIcon,
  ChevronDown,
  CornerRightUp,
  Paperclip,
  Pause,
  X,
} from "lucide-react";
import { SuggestedActions } from "./suggested-actions";
import { ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { Button } from "ui/button";
import { PastesContentCard } from "./pasts-content";
import { UseChatHelpers } from "@ai-sdk/react";
import { SelectModel } from "./select-model";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { myProvider } from "lib/ai/models";
import { createMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { ChatMessageAnnotation } from "app-types/chat";
import dynamic from "next/dynamic";
import { ToolChoiceDropDown } from "./tool-choice-dropdown";
import { PROMPT_PASTE_MAX_LENGTH } from "lib/const";
import { ToolSelector } from "./tool-selector";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { toast } from "sonner";
import { generateUUID } from "lib/utils";

interface PromptInputProps {
  threadId?: string;
  messages?: Array<any>;
  placeholder?: string;
  setInput: (value: string) => void;
  input: string;
  onStop: () => void;
  append: UseChatHelpers["append"];
  toolDisabled?: boolean;
  isLoading?: boolean;
  model?: string;
  setModel?: (model: string) => void;
  voiceDisabled?: boolean;
}

const MentionInput = dynamic(() => import("./mention-input"), {
  ssr: false,
  loading() {
    return <div className="h-[2rem] w-full animate-pulse"></div>;
  },
});

export default function PromptInput({
  placeholder = "What do you want to know?",
  append,
  model,
  setModel,
  input,
  setInput,
  onStop,
  isLoading,
  toolDisabled,
  voiceDisabled,
  threadId,
  messages = [],
}: PromptInputProps) {
  const [mcpList, globalModel, appStoreMutate] = appStore(
    useShallow((state) => [state.mcpList, state.model, state.mutate]),
  );

  const chatModel = useMemo(() => {
    return model ?? globalModel;
  }, [model, globalModel]);

  const setChatModel = useCallback(
    (model: string) => {
      if (setModel) {
        setModel(model);
      } else {
        appStoreMutate({ model });
      }
    },
    [setModel, appStoreMutate],
  );

  const [toolMentionItems, setToolMentionItems] = useState<
    { id: string; label: ReactNode; [key: string]: any }[]
  >([]);

  const modelList = useMemo(() => {
    return myProvider.modelsInfo;
  }, []);

  const [pastedContents, setPastedContents] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<
    Array<{
      id: string;
      url: string;
      name: string;
      mimeType: string;
      data: string;
    }>
  >([]);
  const [uploadQueue, setUploadQueue] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toolList = useMemo(() => {
    return (
      mcpList
        ?.filter((mcp) => mcp.status === "connected")
        .flatMap((mcp) => [
          {
            id: mcp.name,
            label: mcp.name,
            type: "server",
          },
          ...mcp.toolInfo.map((tool) => {
            const id = createMCPToolId(mcp.name, tool.name);
            return {
              id,
              label: id,
              type: "tool",
            };
          }),
        ]) ?? []
    );
  }, [mcpList]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    if (text.length > PROMPT_PASTE_MAX_LENGTH) {
      setPastedContents([...pastedContents, text]);
      e.preventDefault();
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          id: generateUUID(),
          url,
          name: pathname.split("/").pop() || file.name,
          mimeType: contentType,
          data: "", // We don't have the file data here, it's stored in the blob storage
        };
      }
      const { error } = await response.json();
      throw new Error(error || "Upload failed");
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Add files to upload queue
    const newUploads = files.map((file) => ({
      id: generateUUID(),
      name: file.name,
    }));
    setUploadQueue((prev) => [...prev, ...newUploads]);

    try {
      const uploadPromises = files.map((file) => uploadFile(file));
      const uploadedAttachments = await Promise.all(uploadPromises);

      setAttachments((prev) => [...prev, ...uploadedAttachments]);
    } catch (error) {
      toast.error("Failed to upload one or more files");
    } finally {
      // Remove completed uploads from queue
      setUploadQueue((prev) =>
        prev.filter((upload) => !newUploads.some((u) => u.id === upload.id)),
      );
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  const submit = () => {
    if (isLoading) return;
    const userMessage = input?.trim() || "";

    const pastedContentsParsed = pastedContents.map((content) => ({
      type: "text" as const,
      text: content,
    }));

    const attachmentParts = attachments.map((attachment) => ({
      type: "file" as const,
      url: attachment.url,
      name: attachment.name,
      mimeType: attachment.mimeType,
      data: attachment.data,
    }));

    if (
      userMessage.length === 0 &&
      pastedContentsParsed.length === 0 &&
      attachmentParts.length === 0
    ) {
      return;
    }

    const annotations: ChatMessageAnnotation[] = [];
    if (toolMentionItems.length > 0) {
      annotations.push({
        requiredTools: toolMentionItems.map((item) => item.id),
      });
    }

    setPastedContents([]);
    setToolMentionItems([]);
    setAttachments([]);
    setInput("");

    append!({
      role: "user",
      content: "",
      annotations,
      parts: [
        ...pastedContentsParsed,
        ...attachmentParts,
        {
          type: "text",
          text: userMessage,
        },
      ],
    });
  };

  return (
    <div className="w-full fade-in animate-in flex flex-col gap-4">
      {messages.length === 0 && pastedContents.length === 0 && (
        <SuggestedActions append={append} threadId={threadId!} />
      )}
      <div className="z-10 mx-auto w-full relative">
        <fieldset className="flex w-full min-w-0 max-w-full flex-col px-2">
          <div className="rounded-4xl backdrop-blur-sm transition-all duration-200 bg-muted/80 relative flex w-full flex-col cursor-text z-10 border items-stretch focus-within:border-muted-foreground hover:border-muted-foreground p-3">
            <div className="flex flex-col gap-3.5 px-1">
              <div className="relative min-h-[2rem]">
                <MentionInput
                  input={input}
                  onChange={setInput}
                  onChangeMention={setToolMentionItems}
                  onEnter={submit}
                  placeholder={placeholder}
                  onPaste={handlePaste}
                  items={toolList}
                />
              </div>
              <div className="flex flex-col gap-2 w-full">
                {(attachments.length > 0 || uploadQueue.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="relative group">
                        <div className="bg-muted rounded-md p-2 pr-8 text-xs flex items-center gap-2 max-w-xs">
                          <Paperclip className="size-3 flex-shrink-0" />
                          <span className="truncate">{attachment.name}</span>
                          <button
                            type="button"
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAttachment(attachment.id);
                            }}
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {uploadQueue.map((upload) => (
                      <div
                        key={upload.id}
                        className="bg-muted rounded-md p-2 text-xs flex items-center gap-2 max-w-xs opacity-70"
                      >
                        <div className="animate-pulse flex items-center gap-2">
                          <Paperclip className="size-3 flex-shrink-0" />
                          <span className="truncate">{upload.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {pastedContents.map((content, index) => (
                  <PastesContentCard
                    key={index}
                    initialContent={content}
                    deleteContent={() => {
                      setPastedContents((prev) => {
                        const newContents = [...prev];
                        newContents.splice(index, 1);
                        return newContents;
                      });
                    }}
                    updateContent={(content) => {
                      setPastedContents((prev) => {
                        const newContents = [...prev];
                        newContents[index] = content;
                        return newContents;
                      });
                    }}
                  />
                ))}
              </div>
              <div className="flex w-full items-center z-30 gap-1.5">
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                    onClick={(e) => (e.currentTarget.value = "")} // Allow re-uploading the same file
                  />
                  <button
                    type="button"
                    className="cursor-pointer text-muted-foreground border rounded-full p-2 bg-transparent hover:bg-muted transition-all duration-200 disabled:opacity-50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Paperclip className="size-4" />
                  </button>
                </>

                {!toolDisabled && (
                  <>
                    <ToolChoiceDropDown />

                    <ToolSelector align="start" side="top" />
                  </>
                )}
                <div className="flex-1" />

                <SelectModel
                  onSelect={setChatModel}
                  providers={modelList}
                  model={chatModel}
                >
                  <Button variant={"ghost"} className="rounded-full">
                    {chatModel}
                    <ChevronDown className="size-3" />
                  </Button>
                </SelectModel>
                {!isLoading && !input.length && !voiceDisabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => {
                          appStoreMutate((state) => ({
                            voiceChat: {
                              ...state.voiceChat,
                              isOpen: true,
                            },
                          }));
                        }}
                        className="fade-in animate-in cursor-pointer text-background rounded-full p-2 bg-primary hover:bg-primary/90 transition-all duration-200"
                      >
                        <AudioWaveformIcon size={16} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Voice Chat Mode</TooltipContent>
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
                      <Pause
                        size={16}
                        className="fill-muted-foreground text-muted-foreground"
                      />
                    ) : (
                      <CornerRightUp size={16} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
