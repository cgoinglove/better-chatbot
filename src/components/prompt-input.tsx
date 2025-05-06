"use client";

import { ChevronDown, CornerRightUp, Paperclip, Pause } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { Button } from "ui/button";
import { notImplementedToast } from "ui/shared-toast";
import { PastesContentCard } from "./pasts-content";
import { UseChatHelpers } from "@ai-sdk/react";
import { SelectModel } from "./select-model";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { customModelProvider } from "lib/ai/models";
import { createMCPToolId } from "lib/ai/mcp/mcp-tool-id";
import { ChatMessageAnnotation } from "app-types/chat";
import dynamic from "next/dynamic";
import { ToolChoiceDropDown } from "./tool-choice-dropdown";

import { MCPServerBindingSelector } from "./mcp-server-binding";
import { MCPServerBinding } from "app-types/mcp";

interface PromptInputProps {
  placeholder?: string;
  setInput: (value: string) => void;
  input: string;
  onStop: () => void;
  ownerType?: MCPServerBinding["ownerType"];
  ownerId: string;
  append: UseChatHelpers["append"];
  isTemporaryChat?: boolean;
  isLoading?: boolean;
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
  input,
  setInput,
  onStop,
  isLoading,
  isTemporaryChat,
  ownerType = "thread",
  ownerId,
}: PromptInputProps) {
  const [appStoreMutate, model, mcpList] = appStore(
    useShallow((state) => [state.mutate, state.model, state.mcpList]),
  );

  const [toolMentionItems, setToolMentionItems] = useState<
    { id: string; label: ReactNode; [key: string]: any }[]
  >([]);

  const modelList = useMemo(() => {
    return customModelProvider.modelsInfo;
  }, []);

  const [pastedContents, setPastedContents] = useState<string[]>([]);

  const toolList = useMemo(() => {
    return (
      mcpList
        ?.filter((mcp) => !mcp.error)
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
    if (text.length > 500) {
      setPastedContents([...pastedContents, text]);
      e.preventDefault();
    }
  };

  const submit = () => {
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
        requiredTools: toolMentionItems.map((item) => item.id),
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
          <div className="rounded-4xl backdrop-blur-sm transition-all duration-200 bg-muted/40 relative flex w-full flex-col cursor-text z-10 border items-stretch focus-within:border-muted-foreground hover:border-muted-foreground p-3">
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
              <div className="flex w-full items-center z-30 gap-1.5">
                <div
                  className="cursor-pointer text-muted-foreground border rounded-full p-2 bg-transparent hover:bg-muted transition-all duration-200"
                  onClick={notImplementedToast}
                >
                  <Paperclip className="size-4" />
                </div>

                <ToolChoiceDropDown />
                {!isTemporaryChat && (
                  <MCPServerBindingSelector
                    ownerId={ownerId}
                    ownerType={ownerType}
                    align="start"
                    side="top"
                  />
                )}
                <div className="flex-1" />

                <SelectModel
                  onSelect={(model) => {
                    appStoreMutate({ model });
                  }}
                  providers={modelList}
                  model={model}
                >
                  <Button variant={"ghost"} className="rounded-full">
                    {model}
                    <ChevronDown className="size-3" />
                  </Button>
                </SelectModel>

                <div
                  onClick={() => {
                    if (isLoading) {
                      onStop();
                    } else {
                      submit();
                    }
                  }}
                  className="cursor-pointer text-muted-foreground rounded-full p-2 bg-secondary hover:bg-accent-foreground hover:text-accent transition-all duration-200"
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
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
