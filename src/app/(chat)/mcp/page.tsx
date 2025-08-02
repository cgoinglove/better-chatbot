"use client";
import { MCPCard } from "@/components/mcp-card";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MCPOverview } from "@/components/mcp-overview";

import { Skeleton } from "ui/skeleton";

import { ScrollArea } from "ui/scroll-area";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const LightRays = dynamic(() => import("@/components/ui/light-rays"), {
  ssr: false,
});

export default function Page() {
  const t = useTranslations("MCP");
  const { data: mcpList, isLoading } = useMcpList({
    refreshInterval: 10000,
  });

  const particle = useMemo(() => {
    if (isLoading || mcpList?.length !== 0) return;
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
  }, [isLoading, mcpList]);

  return (
    <>
      {particle}
      <ScrollArea className="h-full w-full z-40">
        <div className="flex-1 relative flex flex-col gap-4 px-8 py-8 max-w-3xl h-full mx-auto">
          <div className="flex items-center mb-4">
            <h1 className="text-2xl font-bold">MCP Servers</h1>
            <div className="flex-1" />

            <div className="flex gap-2">
              <Link
                href="https://smithery.ai/"
                target="_blank"
                className="hidden sm:block"
              >
                <Button className="font-semibold" variant={"ghost"}>
                  {t("marketplace")}
                </Button>
              </Link>
              <Link href="/mcp/create">
                <Button className="font-semibold bg-input/20" variant="outline">
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
          ) : mcpList?.length ? (
            <div className="flex flex-col gap-6 my-4">
              {mcpList.map((mcp) => (
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
