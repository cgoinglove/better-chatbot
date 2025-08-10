"use client";

import { SidebarMenuAction } from "ui/sidebar";
import Link from "next/link";
import { SidebarMenuButton, SidebarMenuSkeleton } from "ui/sidebar";
import { SidebarGroupContent, SidebarMenu, SidebarMenuItem } from "ui/sidebar";
import { SidebarGroup } from "ui/sidebar";
import { ArrowUpRightIcon, MoreHorizontal, PlusIcon } from "lucide-react";

import { useMounted } from "@/hooks/use-mounted";

import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { useAgents } from "@/hooks/queries/use-agents";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { AgentDropdown } from "../agent/agent-dropdown";

import { appStore } from "@/app/store";
import { useRouter } from "next/navigation";
import { ChatMention } from "app-types/chat";
import { BACKGROUND_COLORS, EMOJI_DATA } from "lib/const";
import { Separator } from "ui/separator";

export function AppSidebarAgents() {
  const mounted = useMounted();
  const t = useTranslations();
  const router = useRouter();
  const { agents, myAgents, bookmarkedAgents, sharedAgents, isLoading } =
    useAgents({ limit: 50 }); // Increase limit since we're not artificially limiting display

  const handleAgentClick = useCallback(
    (id: string) => {
      const currentThreadId = appStore.getState().currentThreadId;
      const agent = agents.find((agent) => agent.id === id);

      if (!agent) return;

      const newMention: ChatMention = {
        type: "agent",
        agentId: agent.id,
        name: agent.name,
        icon: agent.icon,
        description: agent.description,
      };

      if (currentThreadId) {
        appStore.setState((prev) => {
          const currentMentions = prev.threadMentions[currentThreadId] || [];

          const target = currentMentions.find(
            (mention) =>
              mention.type == "agent" && mention.agentId === agent.id,
          );

          if (target) {
            return prev;
          }

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
      } else {
        router.push("/");

        appStore.setState(() => ({
          pendingThreadMention: newMention,
        }));
      }
    },
    [agents, router],
  );

  return (
    <SidebarGroup>
      <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/agents">
        <SidebarMenu className="group/agents">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="font-semibold">
              <Link href="/agents">{t("Layout.agents")}</Link>
            </SidebarMenuButton>
            <SidebarMenuAction
              className="group-hover/agents:opacity-100 opacity-0 transition-opacity"
              onClick={() => router.push("/agent/new")}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PlusIcon className="size-4" />
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  {t("Agent.newAgent")}
                </TooltipContent>
              </Tooltip>
            </SidebarMenuAction>
          </SidebarMenuItem>

          {isLoading && agents.length === 0 ? (
            <SidebarMenuItem>
              {Array.from({ length: 2 }).map(
                (_, index) => mounted && <SidebarMenuSkeleton key={index} />,
              )}
            </SidebarMenuItem>
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
                    {sharedAgents.length > 0
                      ? t("Layout.createYourOwnAgentOrSelectShared")
                      : t("Layout.createYourOwnAgent")}
                  </p>
                </div>
              </Link>
            </div>
          ) : (
            <>
              <div className="h-[200px] w-full overflow-y-auto">
                <div className="flex flex-col gap-1">
                  {myAgents?.map((agent, i) => {
                    return (
                      <SidebarMenu
                        key={agent.id}
                        className="group/agent mr-0 w-full"
                      >
                        <SidebarMenuItem
                          className="px-2 cursor-pointer w-full"
                          onClick={() => handleAgentClick(agent.id)}
                        >
                          <SidebarMenuButton
                            asChild
                            className="data-[state=open]:bg-input! w-full"
                          >
                            <div className="flex gap-1 w-full min-w-0">
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

                  {bookmarkedAgents.length > 0 && (
                    <>
                      <Separator className="my-1" />
                      {bookmarkedAgents.map((agent, i) => {
                        return (
                          <SidebarMenu
                            key={agent.id}
                            className="group/agent mr-0 w-full"
                          >
                            <SidebarMenuItem
                              className="px-2 cursor-pointer w-full"
                              onClick={() => handleAgentClick(agent.id)}
                            >
                              <SidebarMenuButton
                                asChild
                                className="data-[state=open]:bg-input! w-full"
                              >
                                <div className="flex gap-1 w-full min-w-0">
                                  <div
                                    className="p-1 rounded-full ring-2 ring-border bg-background"
                                    style={{
                                      backgroundColor:
                                        agent.icon?.style?.backgroundColor ||
                                        BACKGROUND_COLORS[
                                          (i + myAgents.length) %
                                            BACKGROUND_COLORS.length
                                        ],
                                    }}
                                  >
                                    <Avatar className="size-3.5">
                                      <AvatarImage
                                        src={
                                          agent.icon?.value ||
                                          EMOJI_DATA[
                                            (i + myAgents.length) %
                                              EMOJI_DATA.length
                                          ]
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
                                      <SidebarMenuAction className="data-[state=open]:bg-input! data-[state=open]:opacity-100 opacity-0 group-hover/agent:opacity-100 mr-2">
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
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
