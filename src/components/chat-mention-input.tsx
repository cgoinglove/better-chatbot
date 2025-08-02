"use client";
import React, { RefObject, useCallback, useMemo, useRef } from "react";

import { CheckIcon, HammerIcon } from "lucide-react";
import { MCPIcon } from "ui/mcp-icon";

import { ChatMention } from "app-types/chat";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "ui/command";

import MentionInput from "./mention-input";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";

import { appStore } from "@/app/store";
import { cn, toAny } from "lib/utils";
import { useShallow } from "zustand/shallow";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Editor } from "@tiptap/react";
import { DefaultToolName } from "lib/ai/tools";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { DefaultToolIcon } from "./default-tool-icon";
import equal from "lib/equal";
import { EMOJI_DATA } from "lib/const";

interface ChatMentionInputProps {
  onChange: (text: string) => void;
  onChangeMention: (mentions: ChatMention[]) => void;
  onEnter?: () => void;
  placeholder?: string;
  input: string;
  disabledMention?: boolean;
  ref?: RefObject<Editor | null>;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function ChatMentionInput({
  onChange,
  onChangeMention,
  onEnter,
  placeholder,
  ref,
  input,
  disabledMention,
  onFocus,
  onBlur,
}: ChatMentionInputProps) {
  const latestMentions = useRef<string[]>([]);

  const handleChange = useCallback(
    ({
      text,
      mentions,
    }: { text: string; mentions: { label: string; id: string }[] }) => {
      onChange(text);
      const mentionsIds = mentions.map((mention) => mention.id);
      const parsedMentions = mentionsIds.map(
        (id) => JSON.parse(id) as ChatMention,
      );
      if (equal(latestMentions.current, mentionsIds)) return;
      latestMentions.current = mentionsIds;
      onChangeMention(parsedMentions);
    },
    [onChange, onChangeMention],
  );

  return (
    <MentionInput
      content={input}
      onEnter={onEnter}
      placeholder={placeholder}
      suggestionChar="@"
      disabledMention={disabledMention}
      onChange={handleChange}
      MentionItem={ChatMentionInputMentionItem}
      Suggestion={ChatMentionInputSuggestion}
      editorRef={ref}
      onFocus={onFocus}
      onBlur={onBlur}
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
  const item = useMemo(() => JSON.parse(id) as ChatMention, [id]);
  const label = useMemo(() => {
    return (
      <div
        className={cn(
          "flex items-center text-sm px-2 py-0.5 rounded-sm font-semibold transition-colors",
          "text-primary font-bold bg-primary/5",
          className,
        )}
      >
        {toAny(item).label || item.name}
      </div>
    );
  }, [item]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent className="p-4 whitespace-pre-wrap max-w-xs">
        {item.description || "mention"}
      </TooltipContent>
    </Tooltip>
  );
}

export function ChatMentionInputSuggestion({
  onSelectMention,
  onClose,
  top,
  left,
  selectedIds,
  className,
  open,
  onOpenChange,
  children,
  style,
  disabledType,
}: {
  onClose: () => void;
  onSelectMention: (item: { label: string; id: string }) => void;
  top: number;
  left: number;
  className?: string;
  selectedIds?: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  disabledType?: ("mcp" | "workflow" | "defaultTool" | "agent")[];
}) {
  const t = useTranslations("Common");
  const [mcpList, workflowList, agentList] = appStore(
    useShallow((state) => [
      state.mcpList,
      state.workflowToolList,
      state.agentList,
    ]),
  );

  const mcpMentions = useMemo(() => {
    if (disabledType?.includes("mcp")) return null;
    return mcpList
      ?.filter((mcp) => mcp.toolInfo?.length)
      .map((mcp) => {
        const id = JSON.stringify({
          type: "mcpServer",
          name: mcp.name,
          serverId: mcp.id,
          description: `${mcp.name} is an MCP server that includes ${mcp.toolInfo?.length ?? 0} tool(s).`,
          toolCount: mcp.toolInfo?.length ?? 0,
        });
        return (
          <CommandGroup heading={mcp.name} key={mcp.id}>
            <CommandItem
              key={`${mcp.id}-mcp`}
              className="cursor-pointer text-foreground"
              onSelect={() =>
                onSelectMention({
                  label: `mcp("${mcp.name}")`,
                  id,
                })
              }
            >
              <MCPIcon className="size-3.5 text-foreground" />
              <span className="truncate min-w-0">{mcp.name}</span>

              {selectedIds?.includes(id) ? (
                <CheckIcon className="size-3 ml-auto" />
              ) : (
                <span className="ml-auto text-xs text-muted-foreground">
                  {mcp.toolInfo?.length} tools
                </span>
              )}
            </CommandItem>
            {mcp.toolInfo?.map((tool) => {
              return (
                <CommandItem
                  key={`${mcp.id}-${tool.name}`}
                  className="cursor-pointer text-foreground"
                  onSelect={() =>
                    onSelectMention({
                      label: `tool("${tool.name}") `,
                      id: JSON.stringify({
                        type: "mcpTool",
                        name: tool.name,
                        serverId: mcp.id,
                        description: tool.description,
                        serverName: mcp.name,
                      }),
                    })
                  }
                >
                  <HammerIcon className="size-3.5" />
                  <span className="truncate min-w-0">{tool.name}</span>
                  {selectedIds?.includes(id) && (
                    <CheckIcon className="size-3 ml-auto" />
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        );
      });
  }, [mcpList, selectedIds, disabledType]);

  const agentMentions = useMemo(() => {
    if (disabledType?.includes("agent")) return null;
    if (!agentList.length) return null;
    return (
      <CommandGroup heading="Agents" key="agent">
        {agentList.map((agent, i) => {
          const id = JSON.stringify({
            type: "agent",
            name: agent.name,
            agentId: agent.id,
            description: agent.description,
            icon: agent.icon,
          });
          return (
            <CommandItem
              key={agent.id}
              className="cursor-pointer text-foreground"
              onSelect={() =>
                onSelectMention({
                  label: `agent("${agent.name}")`,
                  id,
                })
              }
            >
              <Avatar
                style={agent.icon?.style}
                className="size-3.5 ring-[1px] ring-input rounded-full"
              >
                <AvatarImage
                  src={agent.icon?.value || EMOJI_DATA[i % EMOJI_DATA.length]}
                />
                <AvatarFallback>{agent.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="truncate min-w-0">{agent.name}</span>
              {selectedIds?.includes(id) && (
                <CheckIcon className="size-3 ml-auto" />
              )}
            </CommandItem>
          );
        })}
      </CommandGroup>
    );
  }, [agentList, selectedIds, disabledType]);

  const workflowMentions = useMemo(() => {
    if (disabledType?.includes("workflow")) return null;
    if (!workflowList.length) return null;
    return (
      <CommandGroup heading="Workflows" key="workflows">
        {workflowList.map((workflow) => {
          const id = JSON.stringify({
            type: "workflow",
            name: workflow.name,
            workflowId: workflow.id,
            icon: workflow.icon,
            description: workflow.description,
          });
          return (
            <CommandItem
              key={workflow.id}
              className="cursor-pointer text-foreground"
              onSelect={() =>
                onSelectMention({
                  label: `tool("${workflow.name}")`,
                  id,
                })
              }
            >
              <Avatar
                style={workflow.icon?.style}
                className="size-3.5 ring-[1px] ring-input rounded-full"
              >
                <AvatarImage src={workflow.icon?.value} />
                <AvatarFallback>{workflow.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="truncate min-w-0">{workflow.name}</span>
              {selectedIds?.includes(id) && (
                <CheckIcon className="size-3 ml-auto" />
              )}
            </CommandItem>
          );
        })}
      </CommandGroup>
    );
  }, [workflowList, selectedIds, disabledType]);

  const defaultToolMentions = useMemo(() => {
    if (disabledType?.includes("defaultTool")) return null;
    const items = Object.values(DefaultToolName).map((toolName) => {
      let label = toolName as string;
      const icon = <DefaultToolIcon name={toolName} />;
      let description = "";
      switch (toolName) {
        case DefaultToolName.CreatePieChart:
          label = "pie-chart";
          description = "Create a pie chart";
          break;
        case DefaultToolName.CreateBarChart:
          label = "bar-chart";
          description = "Create a bar chart";
          break;
        case DefaultToolName.CreateLineChart:
          label = "line-chart";
          description = "Create a line chart";
          break;
        case DefaultToolName.WebSearch:
          label = "web-search";
          description = "Search the web";
          break;
        case DefaultToolName.WebContent:
          label = "web-content";
          description = "Get the content of a web page";
          break;
        case DefaultToolName.Http:
          label = "HTTP";
          description = "Send an http request";
          break;
        case DefaultToolName.JavascriptExecution:
          label = "js-execution";
          description = "Execute simple javascript code";
          break;
        case DefaultToolName.PythonExecution:
          label = "python-execution";
          description = "Execute simple python code";
          break;
      }
      return {
        id: toolName,
        label,
        icon,
        description,
      };
    });

    return (
      <>
        <CommandGroup heading="App Tools" key="default-tool">
          {items.map((item) => {
            const id = JSON.stringify({
              type: "defaultTool",
              name: item.id,
              label: item.label,
              description: item.description,
            });
            return (
              <CommandItem
                key={item.id}
                onSelect={() =>
                  onSelectMention({
                    label: `tool('${item.label}')`,
                    id,
                  })
                }
              >
                {item.icon}
                <span className="truncate min-w-0">{item.label}</span>
                {selectedIds?.includes(id) && (
                  <CheckIcon className="size-3 ml-auto" />
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </>
    );
  }, [selectedIds, disabledType]);

  const trigger = useMemo(() => {
    if (children) return children;
    return (
      <span
        className="fixed z-50"
        style={{
          top,
          left,
        }}
      ></span>
    );
  }, [children, top, left]);

  return (
    <Popover
      open={open ?? true}
      onOpenChange={(f) => {
        !f && onClose();
        onOpenChange?.(f);
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className={cn("p-0 w-xs", className)}
        align="start"
        side="top"
        style={style}
      >
        <Command className="w-full">
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
            {agentMentions}
            {workflowMentions}
            {defaultToolMentions}
            {mcpMentions}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
