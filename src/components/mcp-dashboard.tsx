"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MCPOverview, RECOMMENDED_MCPS } from "@/components/mcp-overview";

import { Skeleton } from "ui/skeleton";

import { ScrollArea } from "ui/scroll-area";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";
import { useMcpList, McpListItem } from "@/hooks/queries/use-mcp-list";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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
import { Card, CardHeader, CardTitle } from "ui/card";
import { MCPCard } from "@/components/mcp-card";
import { authClient } from "auth/client";

const LightRays = dynamic(() => import("@/components/ui/light-rays"), {
  ssr: false,
});

export default function MCPDashboard({ message }: { message?: string }) {
  const t = useTranslations("");
  const router = useRouter();
  const { data, isLoading, isValidating } = useMcpList({
    refreshInterval: 10000,
  });
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const statusWeight = (s: McpListItem["status"]) =>
    s === "authorizing" ? 0 : 1;
  const sortedMy = useMemo(() => {
    const mine = data.filter((i) => i.owner.id === currentUserId);
    return mine.sort((a, b) => {
      const w = statusWeight(a.status) - statusWeight(b.status);
      return w !== 0 ? w : a.name.localeCompare(b.name);
    });
  }, [data, currentUserId]);
  const sortedShared = useMemo(() => {
    const shared = data.filter((i) => i.owner.id !== currentUserId);
    return shared.sort((a, b) => {
      const w = statusWeight(a.status) - statusWeight(b.status);
      return w !== 0 ? w : a.name.localeCompare(b.name);
    });
  }, [data, currentUserId]);

  const displayIcons = useMemo(() => {
    const shuffled = [...RECOMMENDED_MCPS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, [data.length]);

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
  }, []);

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
              {t("Mcp.title")}
              {showValidating && isValidating && !isLoading && (
                <Loader2 className="size-4 animate-spin" />
              )}
            </h1>
            <div className="flex-1" />

            <div className="flex gap-2">
              {data?.length ? (
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
                  {t("Mcp.create")}
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
          ) : data?.length === 0 ? (
            <MCPOverview />
          ) : (
            <div className="flex flex-col gap-10 mb-4 z-20">
              {/* My MCP Servers */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {t("Mcp.myServers")}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="flex flex-col gap-6">
                  {sortedMy.map((item) => (
                    <MCPCard
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      config={item.config}
                      status={item.status}
                      error={item.error}
                      toolInfo={item.toolInfo}
                      visibility={item.visibility}
                      isOwner={item.owner.id === currentUserId}
                    />
                  ))}
                  {sortedMy.length === 0 && (
                    <Card className="bg-transparent border-none">
                      <CardHeader className="text-center py-12">
                        <CardTitle>{t("Mcp.noMyServers")}</CardTitle>
                      </CardHeader>
                    </Card>
                  )}
                </div>
              </div>

              {/* Shared MCP Servers */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {t("Mcp.sharedServers")}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="flex flex-col gap-6">
                  {sortedShared.map((item) => (
                    <MCPCard
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      config={item.config}
                      status={item.status}
                      error={item.error}
                      toolInfo={item.toolInfo}
                      visibility={item.visibility}
                      isOwner={item.owner.id === currentUserId}
                    />
                  ))}
                  {sortedShared.length === 0 && (
                    <Card className="bg-transparent border-none">
                      <CardHeader className="text-center py-12">
                        <CardTitle>{t("Mcp.noSharedServers")}</CardTitle>
                      </CardHeader>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}
