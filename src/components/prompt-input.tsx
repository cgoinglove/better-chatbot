"use client";

import {
  AudioWaveformIcon,
  ChevronDown,
  CornerRightUp,
  Paperclip,
  Pause,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "ui/button";
import { notImplementedToast } from "ui/shared-toast";
import { MessagePastesContentCard } from "./message-pasts-content";
import { UseChatHelpers } from "@ai-sdk/react";
import { SelectModel } from "./select-model";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { ChatMention, ChatMessageAnnotation, ChatModel } from "app-types/chat";
import dynamic from "next/dynamic";
import { ToolModeDropdown } from "./tool-mode-dropdown";
import { PROMPT_PASTE_MAX_LENGTH } from "lib/const";
import { ToolSelectDropdown } from "./tool-select-dropdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { useTranslations } from "next-intl";

interface PromptInputProps {
  placeholder?: string;
  setInput: (value: string) => void;
  input: string;
  onStop: () => void;
  append: UseChatHelpers["append"];
  toolDisabled?: boolean;
  isLoading?: boolean;
  model?: ChatModel;
  setModel?: (model: ChatModel) => void;
  voiceDisabled?: boolean;
}

const ChatMentionInput = dynamic(() => import("./chat-mention-input"), {
  ssr: false,
  loading() {
    return <div className="h-[2rem] w-full animate-pulse"></div>;
  },
});

export default function PromptInput({
  placeholder,
  append,
  model,
  setModel,
  input,
  setInput,
  onStop,
  isLoading,
  toolDisabled,
  voiceDisabled,
}: PromptInputProps) {
  const t = useTranslations("Chat");

  const [
    currentThreadId,
    currentProjectId,
    mcpList,
    globalModel,
    appStoreMutate,
  ] = appStore(
    useShallow((state) => [
      state.currentThreadId,
      state.currentProjectId,
      state.mcpList,
      state.chatModel,
      state.mutate,
    ]),
  );

  const chatModel = useMemo(() => {
    return model ?? globalModel;
  }, [model, globalModel]);

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

  const [toolMentionItems, setToolMentionItems] = useState<ChatMention[]>([]);

  const [pastedContents, setPastedContents] = useState<string[]>([]);

  const mentionItems = useMemo(() => {
    return (
      (mcpList?.flatMap((mcp) => [
        {
          type: "mcpServer",
          name: mcp.name,
          serverId: mcp.id,
        },
        ...mcp.toolInfo.map((tool) => {
          return {
            type: "tool",
            name: tool.name,
            serverId: mcp.id,
            serverName: mcp.name,
          };
        }),
      ]) as ChatMention[]) ?? []
    );
  }, [mcpList]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    if (text.length > PROMPT_PASTE_MAX_LENGTH) {
      setPastedContents([...pastedContents, text]);
      e.preventDefault();
    }
  };

  const submit = () => {
    if (isLoading) return;
    const userMessage = input?.trim() || "";

    const pastedContentsParsed = pastedContents.map((content) => ({
      type: "text" as const,
      text: content,
    }));

    if (userMessage.length === 0 && pastedContentsParsed.length === 0) {
      return;
    }

    const annotations: ChatMessageAnnotation[] = [];
    if (toolMentionItems.length > 0) {
      annotations.push({
        mentions: toolMentionItems,
      });
    }
    setPastedContents([]);
    setToolMentionItems([]);
    setInput("");
    append!({
      role: "user",
      content: "",
      annotations,
      parts: [
        ...pastedContentsParsed,
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
          <div className="rounded-4xl backdrop-blur-sm transition-all duration-200 bg-muted/80 relative flex w-full flex-col cursor-text z-10 border items-stretch focus-within:border-muted-foreground hover:border-muted-foreground p-3">
            <div className="flex flex-col gap-3.5 px-1">
              <div className="relative min-h-[2rem]">
                <ChatMentionInput
                  input={input}
                  onChange={setInput}
                  onChangeMention={setToolMentionItems}
                  onEnter={submit}
                  placeholder={placeholder ?? t("placeholder")}
                  onPaste={handlePaste}
                  items={mentionItems}
                />
              </div>
              <div className="flex w-full items-center gap-2">
                {pastedContents.map((content, index) => (
                  <MessagePastesContentCard
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
                <div
                  className="cursor-pointer text-muted-foreground border rounded-full p-2 bg-transparent hover:bg-muted transition-all duration-200"
                  onClick={notImplementedToast}
                >
                  <Paperclip className="size-4" />
                </div>

                {!toolDisabled && (
                  <>
                    <ToolModeDropdown />
                    <ToolSelectDropdown align="start" side="top" />
                  </>
                )}
                <div className="flex-1" />

                <SelectModel onSelect={setChatModel} defaultModel={chatModel}>
                  <Button
                    variant={"ghost"}
                    className="rounded-full data-[state=open]:bg-input! hover:bg-input!"
                  >
                    {chatModel?.model ?? (
                      <span className="text-muted-foreground">model</span>
                    )}
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
                              threadId: currentThreadId ?? undefined,
                              projectId: currentProjectId ?? undefined,
                            },
                          }));
                        }}
                        className="border fade-in animate-in cursor-pointer text-background rounded-full p-2 bg-primary hover:bg-primary/90 transition-all duration-200"
                      >
                        <AudioWaveformIcon size={16} />
                      </div>
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
