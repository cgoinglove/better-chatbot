"use client";
import { MCPCard } from "@/components/mcp-card";
import { appStore } from "@/app/store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MCPOverview } from "@/components/mcp-overview";
import { selectMcpClientsAction } from "@/app/api/mcp/actions";
import useSWR from "swr";
import { Skeleton } from "ui/skeleton";

import { handleErrorWithToast } from "ui/shared-toast";
import { Plus } from "lucide-react";
import { ScrollArea } from "ui/scroll-area";

export default function Page() {
  const appStoreMutate = appStore((state) => state.mutate);

  const { data: mcpList, isLoading } = useSWR(
    "mcp-list",
    selectMcpClientsAction,
    {
      refreshInterval: 10000,
      fallbackData: [],
      onError: handleErrorWithToast,
      onSuccess: (data) => appStoreMutate({ mcpList: data }),
    },
  );

  return (
    <ScrollArea className="h-full w-full">
      <div className="flex-1 relative flex flex-col gap-4 px-8 py-8 max-w-3xl h-full mx-auto">
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold">MCP Servers</h1>
          <div className="flex-1" />

          <div className="flex gap-2">
            <Link href="https://smithery.ai/" target="_blank">
              <Button className="font-semibold" variant={"ghost"}>
                Server Market
              </Button>
            </Link>
            <Link href="/mcp/create">
              <Button
                className="border-dashed border-foreground/20 font-semibold"
                variant="outline"
              >
                <Plus className="stroke-2" />
                Add MCP Server
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
              <MCPCard key={mcp.name} {...mcp} />
            ))}
          </div>
        ) : (
          // When MCP list is empty
          <MCPOverview />
        )}
      </div>
    </ScrollArea>
  );
}
