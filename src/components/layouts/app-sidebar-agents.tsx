"use client";

import { SidebarGroupLabel, SidebarMenuAction } from "ui/sidebar";
import Link from "next/link";
import { SidebarMenuButton, SidebarMenuSkeleton } from "ui/sidebar";
import { SidebarGroupContent, SidebarMenu, SidebarMenuItem } from "ui/sidebar";
import { SidebarGroup } from "ui/sidebar";
import {
  ArrowUpRightIcon,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import { useMounted } from "@/hooks/use-mounted";
import { Button } from "ui/button";

import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useAgents } from "@/hooks/queries/use-agents";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { AgentDropdown } from "../agent-dropdown";

import { appStore } from "@/app/store";
import { useRouter } from "next/navigation";
import { ChatMention } from "app-types/chat";
import { BACKGROUND_COLORS, EMOJI_DATA } from "lib/const";
import { cn } from "lib/utils";

export function AppSidebarAgents() {
  const mounted = useMounted();
  const t = useTranslations();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const { data: agents = [], isLoading } = useAgents();

  const visibleAgents = expanded ? agents : agents.slice(0, 3);
  const hasMoreAgents = agents.length > 3;

  const handleAgentClick = useCallback(
    (id: string) => {
      const currentThreadId = appStore.getState().currentThreadId;
      if (currentThreadId) {
        const agent = agents.find((agent) => agent.id === id);
        if (agent) {
          appStore.setState((prev) => {
            const currentMentions = prev.threadMentions[currentThreadId] || [];

            const target = currentMentions.find(
              (mention) =>
                mention.type == "agent" && mention.agentId === agent.id,
            );

            if (target) {
              return prev;
            }

            const newMention: ChatMention = {
              type: "agent",
              agentId: agent.id,
              name: agent.name,
              icon: agent.icon,
              description: agent.description,
            };

            return {
              threadMentions: {
                ...prev.threadMentions,
                [currentThreadId]: [
                  ...currentMentions.filter((v) => v.type != "agent"),
                  newMention,
                ],
              },
            };
          });
        }
      } else {
        router.push(`/agent/${id}`);
      }
    },
    [agents],
  );

  return (
    <SidebarGroup>
      <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/agents">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarGroupLabel className="">
              <h4 className="text-xs text-muted-foreground flex items-center gap-1 group-hover/agents:text-foreground transition-colors">
                {t("Layout.agents")}
              </h4>
              <div className="flex-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/agent/new">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-input!"
                    >
                      <Plus />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t("Layout.newAgent")}</p>
                </TooltipContent>
              </Tooltip>
            </SidebarGroupLabel>

            {isLoading ? (
              Array.from({ length: 2 }).map(
                (_, index) => mounted && <SidebarMenuSkeleton key={index} />,
              )
            ) : agents.length == 0 ? (
              <div className="px-2 mt-1">
                <Link
                  href={"/agent/new"}
                  className="bg-input/40 py-8 px-4 hover:bg-input/100 rounded-lg cursor-pointer flex justify-between items-center text-xs overflow-hidden"
                >
                  <div className="gap-1 z-10">
                    <div className="flex items-center mb-4 gap-1">
                      <p className="font-semibold">{t("Layout.createAgent")}</p>
                      <ArrowUpRightIcon className="size-3" />
                    </div>
                    <p className="text-muted-foreground">
                      {t("Layout.createYourOwnAgent")}
                    </p>
                  </div>
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1 max-h-[30vh] overflow-y-auto">
                  {expanded && (
                    <div className="absolute -top-8 left-0 w-full h-full pointer-events-none bg-gradient-to-t from-background to-20% to-transparent z-10" />
                  )}
                  {visibleAgents?.map((agent, i) => {
                    const isLast = i === visibleAgents.length - 1 && expanded;
                    return (
                      <SidebarMenu
                        key={agent.id}
                        className={cn("group/agent mr-0", isLast && "mb-2")}
                      >
                        <SidebarMenuItem
                          className="px-2 cursor-pointer"
                          onClick={() => handleAgentClick(agent.id)}
                        >
                          <SidebarMenuButton
                            asChild
                            className="data-[state=open]:bg-input!"
                          >
                            <div className="flex gap-1">
                              <div
                                className="p-1 rounded-full ring-2 ring-border bg-background"
                                style={{
                                  backgroundColor:
                                    agent.icon?.style?.backgroundColor ||
                                    BACKGROUND_COLORS[
                                      i % BACKGROUND_COLORS.length
                                    ],
                                }}
                              >
                                <Avatar className="size-3.5">
                                  <AvatarImage
                                    src={
                                      agent.icon?.value ||
                                      EMOJI_DATA[i % EMOJI_DATA.length]
                                    }
                                  />
                                  <AvatarFallback className="bg-transparent">
                                    {agent.name[0]}
                                  </AvatarFallback>
                                </Avatar>
                              </div>

                              <div className="flex items-center min-w-0 w-full">
                                <p className="truncate">{agent.name}</p>
                              </div>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                              >
                                <AgentDropdown
                                  agent={agent}
                                  side="right"
                                  align="start"
                                >
                                  <SidebarMenuAction className="data-[state=open]:bg-input! data-[state=open]:opacity-100  opacity-0 group-hover/agent:opacity-100 mr-2">
                                    <MoreHorizontal className="size-4" />
                                  </SidebarMenuAction>
                                </AgentDropdown>
                              </div>
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    );
                  })}
                </div>
                {hasMoreAgents && (
                  <SidebarMenu className="group/agent mr-0 mt-2">
                    <SidebarMenuItem className="px-2 cursor-pointer">
                      <SidebarMenuButton
                        asChild
                        onClick={() => setExpanded(!expanded)}
                      >
                        <div className="flex gap-1 text-muted-foreground">
                          <p>
                            {expanded
                              ? t("Common.showLess")
                              : t("Common.showMore")}
                          </p>

                          {expanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                )}
              </>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
