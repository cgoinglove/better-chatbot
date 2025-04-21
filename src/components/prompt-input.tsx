"use client";

import { appStore } from "@/app/store";
import { UseChatHelpers } from "@ai-sdk/react";
import { GitHubFileSearchResult } from "app-types/github";
import { customModelProvider } from "lib/ai/models";
import { cn } from "lib/utils";
import { Check, CornerRightUp, Paperclip, Pause } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { Button } from "ui/button";
import { useShallow } from "zustand/shallow";
import { GitHubFileViewer } from "./github-file-viewer";
import { GitHubRepositorySelector } from "./github-repository-selector";
import { GitHubSearch } from "./github-search";
import { PastesContentCard } from "./pasts-content";
import { SelectModel } from "./select-model";

import { ChatMessageAnnotation } from "app-types/chat";
import { createMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import dynamic from "next/dynamic";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import { FileAttachmentView } from "./file-attachment-view";
import { FileUpload, UploadedFile } from "./file-upload";
import { McpListCombo } from "./mcp-list-combo";

interface PromptInputProps {
  placeholder?: string;
  setInput: (value: string) => void;
  input: string;
  onStop: () => void;
  append: UseChatHelpers["append"];
  threadId: string;
  isLoading?: boolean;
}

const MentionInput = dynamic(() => import("./mention-input"), {
  ssr: false,
  loading() {
    return <div className="h-[4rem] w-full animate-pulse"></div>;
  },
});

export default function PromptInput({
  placeholder = "Type a message...",
  threadId,
  append,
  input,
  setInput,
  onStop,
  isLoading,
}: PromptInputProps) {
  const [
    appStoreMutate,
    model,
    activeTool,
    mcpList,
    currentGithubRepositoryId,
  ] = appStore(
    useShallow((state) => [
      state.mutate,
      state.model,
      state.activeTool,
      state.mcpList,
      state.currentGithubRepositoryId,
    ]),
  );

  const [toolMentionItems, setToolMentionItems] = useState<
    { id: string; label: ReactNode }[]
  >([]);

  const modelList = useMemo(() => {
    return customModelProvider.modelsInfo;
  }, []);

  const [pastedContents, setPastedContents] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showGithubSearch, setShowGithubSearch] = useState(false);
  const [selectedGithubFile, setSelectedGithubFile] =
    useState<GitHubFileSearchResult | null>(null);

  const toolList = useMemo(() => {
    return mcpList
      .filter((mcp) => mcp.status === "connected")
      .flatMap((mcp) => [
        {
          id: mcp.name,
          label: mcp.name,
        },
        ...mcp.toolInfo.map((tool) => {
          const id = createMCPToolId(mcp.name, tool.name);
          return {
            id,
            label: id,
          };
        }),
      ]);
  }, [mcpList]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    if (text.length > 500) {
      setPastedContents([...pastedContents, text]);
      e.preventDefault();
    } else {
      setInput(input + text);
    }
  };

  const submit = () => {
    const userMessage = input?.trim() || "";

    const pastedContentsParsed = pastedContents.map((content) => ({
      type: "text" as const,
      text: content,
    }));

    const fileAttachments = uploadedFiles.map((file) => ({
      type: "file-attachment" as const,
      file_attachment: {
        id: file.id,
        filename: file.filename,
        mimetype: file.mimetype,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
      },
    }));

    if (
      userMessage.length === 0 &&
      pastedContentsParsed.length === 0 &&
      fileAttachments.length === 0
    ) {
      return;
    }

    const chatPath = `/chat/${threadId}`;
    if (window.location.pathname !== chatPath) {
      window.history.replaceState({}, "", chatPath);
    }

    const annotations: ChatMessageAnnotation[] = [];
    if (toolMentionItems.length > 0) {
      annotations.push({
        requiredTools: toolMentionItems.map((item) => item.id),
      });
    }
    setPastedContents([]);
    setToolMentionItems([]);
    setUploadedFiles([]);
    setInput("");
    append!({
      role: "user",
      content: "",
      annotations,
      parts: [
        ...pastedContentsParsed,
        ...fileAttachments,
        {
          type: "text",
          text: userMessage,
        },
      ],
    });
  };

  return (
    <div className="max-w-3xl mx-auto fade-in animate-in">
      <div className="z-10 mx-auto w-full max-w-3xl relative">
        <fieldset className="flex w-full min-w-0 max-w-full flex-col px-2">
          <div className="rounded-4xl backdrop-blur-sm transition-all duration-200 shadow-lg dark:bg-muted/20 bg-muted/40 border-dashed relative flex w-full flex-col cursor-text z-10 border border-muted items-stretch focus-within:border-muted-foreground hover:border-muted-foreground p-3">
            <div className="flex flex-col gap-3.5 px-1">
              <div className="relative min-h-[4rem]">
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
              <div className="flex w-full items-center gap-2">
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

              {uploadedFiles.length > 0 && (
                <div className="flex w-full items-start gap-2 mb-2">
                  <FileAttachmentView
                    attachments={uploadedFiles}
                    compact
                    onRemove={(id) => {
                      setUploadedFiles((prev) =>
                        prev.filter((file) => file.id !== id),
                      );
                    }}
                  />
                </div>
              )}
              <div className="flex w-full items-center z-30">
                <Popover open={showFileUpload} onOpenChange={setShowFileUpload}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer"
                    >
                      <Paperclip />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-2" align="start">
                    <FileUpload
                      onFileUpload={(file) => {
                        setUploadedFiles((prev) => [...prev, file]);
                        setShowFileUpload(false);
                      }}
                      uploadedFiles={uploadedFiles}
                    />
                  </PopoverContent>
                </Popover>

                <SelectModel
                  onSelect={(model) => {
                    appStoreMutate({ model });
                  }}
                  providers={modelList}
                  model={model}
                >
                  <Button size={"sm"} variant={"ghost"}>
                    {model}
                  </Button>
                </SelectModel>
                <div className="flex-1" />
                {currentGithubRepositoryId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGithubSearch(true)}
                    className="mr-1"
                  >
                    Search Code
                  </Button>
                )}
                <GitHubRepositorySelector />
                <McpListCombo>
                  <Button
                    variant={activeTool ? "secondary" : "ghost"}
                    className={cn(
                      !activeTool && "text-muted-foreground",
                      "font-semibold mr-1 rounded-full",
                    )}
                  >
                    {activeTool && <Check size={3.5} />}
                    tools
                  </Button>
                </McpListCombo>
                <Button
                  onClick={() => {
                    if (isLoading) {
                      onStop();
                    } else {
                      submit();
                    }
                  }}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    input.length > 0
                      ? "text-foreground"
                      : "text-muted-foreground",
                    "cursor-pointer rounded-xl",
                  )}
                >
                  {isLoading ? (
                    <Pause
                      size={16}
                      className="fill-muted-foreground text-muted-foreground"
                    />
                  ) : (
                    <CornerRightUp size={16} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </fieldset>
      </div>

      {/* GitHub Search Dialog */}
      {showGithubSearch && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg shadow-lg w-full max-w-2xl p-6">
            <h2 className="text-xl font-bold mb-4">
              Search Code in Repository
            </h2>
            {selectedGithubFile ? (
              <GitHubFileViewer
                file={selectedGithubFile}
                onClose={() => setSelectedGithubFile(null)}
              />
            ) : (
              <GitHubSearch
                onSelect={(file) => setSelectedGithubFile(file)}
                onCancel={() => setShowGithubSearch(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
