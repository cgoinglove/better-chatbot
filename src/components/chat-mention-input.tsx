"use client";
import React, { useCallback, useMemo } from "react";

import { WrenchIcon } from "lucide-react";
import { MCPIcon } from "ui/mcp-icon";

import { ChatMention } from "app-types/chat";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "ui/command";

import MentionInput from "./mention-input";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import { createPortal } from "react-dom";
import { appStore } from "@/app/store";
import { cn } from "lib/utils";

interface ChatMentionInputProps {
  onChange: (text: string) => void;
  onChangeMention: (mentions: ChatMention[]) => void;
  onEnter?: () => void;
  placeholder?: string;
  input: string;
}

export default function ChatMentionInput({
  onChange,
  onChangeMention,
  onEnter,
  placeholder,
  input,
}: ChatMentionInputProps) {
  const handleChange = useCallback(
    ({
      text,
      mentions,
    }: { text: string; mentions: { label: string; id: string }[] }) => {
      onChange(text);
      onChangeMention(
        mentions.map((mention) => JSON.parse(mention.id) as ChatMention),
      );
    },
    [onChange, onChangeMention],
  );

  return (
    <MentionInput
      content={input}
      onEnter={onEnter}
      placeholder={placeholder}
      suggestionChar="@"
      onChange={handleChange}
      MentionItem={ChatMentionInputMentionItem}
      Suggestion={ChatMentionInputSuggestion}
    />
  );
}

export function ChatMentionInputMentionItem({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const item = JSON.parse(id) as ChatMention;

  const label = (
    <div
      className={cn(
        "flex items-center text-sm gap-2 mx-1 px-2 py-0.5 font-semibold rounded-lg ring ring-blue-500/20 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:ring-blue-500 transition-colors",
        className,
      )}
    >
      {item.type == "mcpServer" ? (
        <MCPIcon className="size-3" />
      ) : (
        <WrenchIcon className="size-3" />
      )}
      {item.name}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent className="p-4 whitespace-pre-wrap max-w-xs">
        {item.description || "mention"}
      </TooltipContent>
    </Tooltip>
  );
}

function ChatMentionInputSuggestion({
  onSelectMention,
  onClose,
  top,
  left,
}: {
  onClose: () => void;
  onSelectMention: (item: { label: string; id: string }) => void;
  top: number;
  left: number;
}) {
  const t = useTranslations("Common");
  const mcpList = appStore((state) => state.mcpList);
  const mentionItems = useMemo(() => {
    return (
      (mcpList
        ?.filter((mcp) => mcp.toolInfo?.length)
        .flatMap((mcp) => [
          {
            type: "mcpServer",
            name: mcp.name,
            serverId: mcp.id,
            description: `${mcp.name} is an MCP server that includes ${mcp.toolInfo?.length ?? 0} tool(s).`,
            toolCount: mcp.toolInfo?.length ?? 0,
          },
          ...mcp.toolInfo.map((tool) => {
            return {
              type: "tool",
              name: tool.name,
              serverId: mcp.id,
              description: tool.description,
              serverName: mcp.name,
            };
          }),
        ]) as ChatMention[]) ?? []
    );
  }, [mcpList]);

  return createPortal(
    <Popover open onOpenChange={(f) => !f && onClose()}>
      <PopoverTrigger asChild>
        <span
          className="fixed z-50"
          style={{
            top,
            left,
          }}
        ></span>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-xs" align="start" side="top">
        <Command>
          <CommandInput
            onKeyDown={(e) => {
              if (e.key == "Backspace" && !e.currentTarget.value) {
                onClose();
              }
            }}
            placeholder={t("search")}
          />
          <CommandList className="p-2">
            <CommandEmpty>{t("noResults")}</CommandEmpty>

            {mentionItems.map((item) => {
              const key =
                item.type == "mcpServer"
                  ? item.serverId
                  : `${item.serverId}-${item.name}`;
              return (
                <CommandItem
                  key={key}
                  className="cursor-pointer text-foreground"
                  onSelect={() =>
                    onSelectMention({
                      label: `${item.name} `,
                      id: JSON.stringify(item),
                    })
                  }
                >
                  {item.type == "mcpServer" ? (
                    <div className="p-1 bg-secondary rounded-sm ring ring-input">
                      <MCPIcon className="size-3.5 text-foreground" />
                    </div>
                  ) : (
                    <div className="p-1">
                      <WrenchIcon className="size-3.5" />
                    </div>
                  )}
                  <span className="truncate min-w-0">{item.name}</span>
                  {item.type == "mcpServer" ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {item.toolCount} tools
                    </span>
                  ) : (
                    item.type === "tool" && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {item.serverName}
                      </span>
                    )
                  )}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>,
    document.body,
  );
}
