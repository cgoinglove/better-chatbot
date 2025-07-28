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
  MoreHorizontalIcon,
  Plus,
} from "lucide-react";

import { useMounted } from "@/hooks/use-mounted";
import { Button } from "ui/button";

import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAgents } from "@/hooks/queries/use-agents";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { AgentDropdown } from "../agent-dropdown";

import DecryptedText from "ui/decrypted-text";

export function AppSidebarAgents() {
  const mounted = useMounted();
  const t = useTranslations();

  const [expanded, setExpanded] = useState(false);
  const { data: agents = [], isLoading } = useAgents();

  const visibleAgents = expanded ? agents : agents.slice(0, 5);
  const hasMoreAgents = agents.length > 5;

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
                      <p className="font-semibold">
                        <DecryptedText
                          text={t("Layout.createAgent")}
                          animateOn="view"
                        />
                      </p>
                      <ArrowUpRightIcon className="size-3" />
                    </div>
                    <p className="text-muted-foreground">
                      <DecryptedText
                        maxIterations={20}
                        text={t("Layout.createYourOwnAgent")}
                        animateOn="view"
                      />
                    </p>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {visibleAgents?.map((agent) => {
                  return (
                    <SidebarMenu key={agent.id} className={"group/agent mr-0"}>
                      <SidebarMenuItem className="px-2 cursor-pointer">
                        <SidebarMenuButton
                          asChild
                          className="data-[state=open]:bg-input!"
                        >
                          <div className="flex gap-1">
                            <div
                              className="p-0.5 rounded ring ring-input bg-background"
                              style={{
                                backgroundColor:
                                  agent.icon?.style?.backgroundColor,
                              }}
                            >
                              <Avatar className="size-4">
                                <AvatarImage
                                  src={
                                    agent.icon?.value ||
                                    "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f604.png"
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
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  );
                })}

                {hasMoreAgents && (
                  <SidebarMenu className="group/agent mr-0">
                    <SidebarMenuItem className="px-2 cursor-pointer">
                      <SidebarMenuButton
                        asChild
                        onClick={() => setExpanded(!expanded)}
                      >
                        <div className="flex gap-1 text-muted-foreground">
                          <div className="p-1 rounded-md hover:bg-foreground/40">
                            <MoreHorizontalIcon className="size-4" />
                          </div>

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
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
