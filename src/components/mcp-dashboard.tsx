"use client";
import { MCPCard } from "@/components/mcp-card";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MCPOverview, RECOMMENDED_MCPS } from "@/components/mcp-overview";

import { Skeleton } from "ui/skeleton";

import { ScrollArea } from "ui/scroll-area";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { MCPServerInfo } from "app-types/mcp";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { useRouter } from "next/navigation";

const LightRays = dynamic(() => import("@/components/ui/light-rays"), {
  ssr: false,
});

export default function MCPDashboard({ message }: { message?: string }) {
  const t = useTranslations("MCP");
  const router = useRouter();
  const {
    data: mcpList,
    isLoading,
    isValidating,
  } = useMcpList({
    refreshInterval: 10000,
  });

  const sortedMcpList = useMemo(() => {
    return (mcpList as (MCPServerInfo & { id: string })[])?.sort((a, b) => {
      if (a.status === b.status) return 0;
      if (a.status === "authorizing") return -1;
      if (b.status === "authorizing") return 1;
      return 0;
    });
  }, [mcpList]);

  const displayIcons = useMemo(() => {
    const shuffled = [...RECOMMENDED_MCPS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, []);

  // Delay showing validating spinner until validating persists for 500ms
  const [showValidating, setShowValidating] = useState(false);

  const handleRecommendedSelect = (mcp: (typeof RECOMMENDED_MCPS)[number]) => {
    const params = new URLSearchParams();
    params.set("name", mcp.name);
    params.set("config", JSON.stringify(mcp.config));
    router.push(`/mcp/create?${params.toString()}`);
  };

  const particle = useMemo(() => {
    return (
      <>
        <div className="absolute opacity-30 pointer-events-none top-0 left-0 w-full h-full z-10 fade-in animate-in duration-5000">
          <LightRays className="bg-transparent" />
        </div>

        <div className="absolute pointer-events-none top-0 left-0 w-full h-full z-10 fade-in animate-in duration-5000">
          <div className="w-full h-full bg-gradient-to-t from-background to-50% to-transparent z-20" />
        </div>
        <div className="absolute pointer-events-none top-0 left-0 w-full h-full z-10 fade-in animate-in duration-5000">
          <div className="w-full h-full bg-gradient-to-l from-background to-20% to-transparent z-20" />
        </div>
        <div className="absolute pointer-events-none top-0 left-0 w-full h-full z-10 fade-in animate-in duration-5000">
          <div className="w-full h-full bg-gradient-to-r from-background to-20% to-transparent z-20" />
        </div>
      </>
    );
  }, [mcpList.length]);

  useEffect(() => {
    if (isValidating) {
      setShowValidating(false);
      const timerId = setTimeout(() => setShowValidating(true), 500);
      return () => clearTimeout(timerId);
    }
    setShowValidating(false);
  }, [isValidating]);

  useEffect(() => {
    if (message) {
      toast(<p className="whitespace-pre-wrap break-all">{message}</p>, {
        id: "mcp-list-message",
      });
    }
  }, []);

  return (
    <>
      {particle}
      <ScrollArea className="h-full w-full z-40 ">
        <div className="pt-8 flex-1 relative flex flex-col gap-4 px-8 max-w-3xl h-full mx-auto pb-8">
          <div className={cn("flex items-center  pb-8")}>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              MCP Servers
              {showValidating && isValidating && !isLoading && (
                <Loader2 className="size-4 animate-spin" />
              )}
            </h1>
            <div className="flex-1" />

            <div className="flex gap-2">
              {mcpList?.length ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="gap-1 data-[state=open]:bg-muted data-[state=open]:text-foreground text-muted-foreground"
                    >
                      <div className="flex -space-x-2">
                        {displayIcons.map((mcp, index) => {
                          const Icon = mcp.icon;
                          return (
                            <div
                              key={mcp.name}
                              className="relative rounded-full bg-background border-[1px] p-1"
                              style={{
                                zIndex: displayIcons.length - index,
                              }}
                            >
                              <Icon className="size-3" />
                            </div>
                          );
                        })}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {RECOMMENDED_MCPS.map((mcp) => {
                      const Icon = mcp.icon;
                      return (
                        <DropdownMenuItem
                          key={mcp.name}
                          onClick={() => handleRecommendedSelect(mcp)}
                          className="cursor-pointer"
                        >
                          <Icon className="size-4 mr-2" />
                          <span>{mcp.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              <Link href="/mcp/create">
                <Button className="font-semibold" variant="outline">
                  <MCPIcon className="fill-foreground size-3.5" />
                  {t("addMcpServer")}
                </Button>
              </Link>
            </div>
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-60 w-full" />
              <Skeleton className="h-60 w-full" />
              <Skeleton className="h-60 w-full" />
            </div>
          ) : sortedMcpList?.length ? (
            <div className="flex flex-col gap-6 mb-4 z-20">
              {sortedMcpList.map((mcp) => (
                <MCPCard key={mcp.id} {...mcp} />
              ))}
            </div>
          ) : (
            // When MCP list is empty
            <MCPOverview />
          )}
        </div>
      </ScrollArea>
    </>
  );
}
