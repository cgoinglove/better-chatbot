"use client";
import {
  ChevronRight,
  FlaskConical,
  Loader,
  Pencil,
  RotateCw,
  Settings,
  Settings2,
  Trash,
  Wrench,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Button } from "ui/button";
import { Card, CardContent, CardHeader } from "ui/card";
import JsonView from "ui/json-view";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { safe } from "ts-safe";

import { handleErrorWithToast } from "ui/shared-toast";
import {
  refreshMcpClientAction,
  removeMcpClientAction,
} from "@/app/api/mcp/actions";
import type { MCPServerInfo, MCPToolInfo } from "app-types/mcp";

import { ToolDetailPopup } from "./tool-detail-popup";
import { useTranslations } from "next-intl";
import { Separator } from "ui/separator";
import { appStore } from "@/app/store";

// Main MCPCard component
export const MCPCard = memo(function MCPCard({
  id,
  config,
  error,
  status,
  name,
  toolInfo,
}: MCPServerInfo & { id: string }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const t = useTranslations("MCP");
  const appStoreMutate = appStore((state) => state.mutate);

  const isLoading = useMemo(() => {
    return isProcessing || status === "loading";
  }, [isProcessing, status]);

  const errorMessage = useMemo(() => {
    if (error) {
      return JSON.stringify(error);
    }
    return null;
  }, [error]);

  const pipeProcessing = useCallback(
    async (fn: () => Promise<any>) =>
      safe(() => setIsProcessing(true))
        .ifOk(fn)
        .ifOk(() => mutate("/api/mcp/list"))
        .ifFail(handleErrorWithToast)
        .watch(() => setIsProcessing(false)),
    [],
  );

  const handleRefresh = useCallback(
    () => pipeProcessing(() => refreshMcpClientAction(id)),
    [id],
  );

  const handleDelete = useCallback(async () => {
    await pipeProcessing(() => removeMcpClientAction(id));
  }, [id]);

  return (
    <Card className="relative hover:border-foreground/20 transition-colors bg-secondary/40">
      {isLoading && (
        <div className="animate-pulse z-10 absolute inset-0 bg-background/50 flex items-center justify-center w-full h-full" />
      )}
      <CardHeader className="flex items-center gap-1 mb-2">
        {isLoading && <Loader className="size-4 z-20 animate-spin mr-1" />}

        <h4 className="font-bold text-xs sm:text-lg flex items-center gap-1">
          {name}
        </h4>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                appStoreMutate({
                  mcpCustomizationPopup: {
                    id,
                    name,
                    config,
                    status,
                    toolInfo,
                    error,
                  },
                })
              }
            >
              <Settings2 className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("mcpServerCustomization")}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`/mcp/test/${encodeURIComponent(id)}`}
              className="cursor-pointer hidden sm:block"
            >
              <Button variant="ghost" size="icon">
                <FlaskConical className="size-3.5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("toolsTest")}</p>
          </TooltipContent>
        </Tooltip>
        <div className="h-4">
          <Separator orientation="vertical" />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RotateCw className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("refresh")}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("delete")}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`/mcp/modify/${encodeURIComponent(id)}`}
              className="cursor-pointer"
            >
              <Button variant="ghost" size="icon">
                <Pencil className="size-3.5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("edit")}</p>
          </TooltipContent>
        </Tooltip>
      </CardHeader>

      {errorMessage && <ErrorAlert error={errorMessage} />}

      <div className="relative hidden sm:flex w-full">
        <CardContent className="flex min-w-0 w-full h-full flex-row gap-4 text-sm max-h-[240px] overflow-y-auto">
          <div className="w-1/2 min-w-0 flex flex-col h-full pr-2 border-r">
            <div className="flex items-center gap-2 mb-2 pt-2 pb-1 z-10">
              <Settings size={14} className="text-muted-foreground" />
              <h5 className="text-muted-foreground text-sm font-medium">
                {t("configuration")}
              </h5>
            </div>
            <JsonView data={config} />
          </div>

          <div className="w-1/2 min-w-0  flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 pt-2 pb-1 z-10">
              <Wrench size={14} className="text-muted-foreground" />
              <h5 className="text-muted-foreground text-sm font-medium">
                {t("availableTools")}
              </h5>
            </div>

            {toolInfo.length > 0 ? (
              <ToolsList tools={toolInfo} serverId={id} />
            ) : (
              <div className="bg-secondary/30 rounded-md p-3 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("noToolsAvailable")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
});

// Tools list component
const ToolsList = memo(
  ({ tools, serverId }: { tools: MCPToolInfo[]; serverId: string }) => (
    <div className="space-y-2 pr-2">
      {tools.map((tool) => (
        <div
          key={tool.name}
          className="flex items-start gap-2 bg-secondary rounded-md p-2 hover:bg-input transition-colors"
        >
          <ToolDetailPopup tool={tool} serverId={serverId}>
            <div className="flex-1 min-w-0 cursor-pointer">
              <p className="font-medium text-sm mb-1 truncate">{tool.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {tool.description}
              </p>
            </div>
          </ToolDetailPopup>

          <div className="flex items-center px-1 justify-center self-stretch">
            <ChevronRight size={16} />
          </div>
        </div>
      ))}
    </div>
  ),
);

ToolsList.displayName = "ToolsList";

// Error alert component
const ErrorAlert = memo(({ error }: { error: string }) => (
  <div className="px-6 pb-2">
    <Alert variant="destructive" className="border-destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  </div>
));

ErrorAlert.displayName = "ErrorAlert";
