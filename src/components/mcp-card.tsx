"use client";
import {
  ChevronRight,
  FlaskConical,
  ShieldAlertIcon,
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
  authorizeMcpClientAction,
  refreshMcpClientAction,
  removeMcpClientAction,
} from "@/app/api/mcp/actions";

import type { MCPServerInfo, MCPToolInfo } from "app-types/mcp";

import { ToolDetailPopup } from "./tool-detail-popup";
import { useTranslations } from "next-intl";
import { Separator } from "ui/separator";
import { appStore } from "@/app/store";
import { isString } from "lib/utils";

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

  const needsAuthorization = status === "authorizing";
  const isDisabled = isLoading || needsAuthorization;

  const errorMessage = useMemo(() => {
    if (error) {
      return isString(error) ? error : JSON.stringify(error);
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

  const handleAuthorize = useCallback(
    () =>
      pipeProcessing(() =>
        authorizeMcpClientAction(id).then((authUrl) => {
          if (!authUrl) throw new Error("Not Authorizing");
          return new Promise((resolve, reject) => {
            const authWindow = window.open(
              authUrl,
              "oauth",
              "width=600,height=800,scrollbars=yes,resizable=yes",
            );
            if (!authWindow) {
              return reject(
                new Error("Please allow popups for OAuth authentication"),
              );
            }

            let messageHandlerRegistered = false;
            let intervalId: NodeJS.Timeout | null = null;

            // Clean up function
            const cleanup = () => {
              if (messageHandlerRegistered) {
                window.removeEventListener("message", messageHandler);
                messageHandlerRegistered = false;
              }
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
            };

            // Message handler for postMessage communication
            const messageHandler = (event: MessageEvent) => {
              // Security: only accept messages from same origin
              if (event.origin !== window.location.origin) {
                return;
              }

              if (event.data.type === "MCP_OAUTH_SUCCESS") {
                cleanup();
                if (authWindow && !authWindow.closed) {
                  authWindow.close();
                }
                resolve(true);
              } else if (event.data.type === "MCP_OAUTH_ERROR") {
                cleanup();
                if (authWindow && !authWindow.closed) {
                  authWindow.close();
                }
                const errorMessage =
                  event.data.error_description ||
                  event.data.error ||
                  "Authentication failed";
                reject(new Error(errorMessage));
              }
            };

            // Register message event listener
            window.addEventListener("message", messageHandler);
            messageHandlerRegistered = true;

            // Backup: Poll for manual window close (in case postMessage fails)
            intervalId = setInterval(() => {
              if (authWindow.closed) {
                cleanup();
                resolve(true);
              }
            }, 1000);
          });
        }),
      ),
    [id],
  );

  return (
    <Card
      key={`mcp-card-${id}-${status}`}
      className="relative hover:border-foreground/20 transition-colors bg-secondary/40"
    >
      {isLoading && (
        <div className="animate-pulse z-10 absolute inset-0 bg-background/50 flex items-center justify-center w-full h-full" />
      )}
      <CardHeader
        key={`header-${status}-${needsAuthorization}`}
        className="flex items-center gap-1 mb-2"
      >
        {isLoading && <Loader className="size-4 z-20 animate-spin mr-1" />}

        <h4 className="font-bold text-xs sm:text-lg flex items-center gap-1">
          {name}
        </h4>
        <div className="flex-1" />
        {needsAuthorization && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAuthorize}
                  disabled={isProcessing}
                >
                  <ShieldAlertIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Authorize</p>
              </TooltipContent>
            </Tooltip>
            <div className="h-4">
              <Separator orientation="vertical" />
            </div>
          </>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isDisabled}
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
            {isDisabled ? (
              <div className="cursor-pointer hidden sm:block">
                <Button variant="ghost" size="icon" disabled>
                  <FlaskConical className="size-3.5" />
                </Button>
              </div>
            ) : (
              <Link
                href={`/mcp/test/${encodeURIComponent(id)}`}
                className="cursor-pointer hidden sm:block"
              >
                <Button variant="ghost" size="icon">
                  <FlaskConical className="size-3.5" />
                </Button>
              </Link>
            )}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RotateCw className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("refresh")}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isLoading}
            >
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

      {needsAuthorization && (
        <div className="px-6 pb-2">
          <Alert
            className="cursor-pointer hover:bg-accent/10 transition-colors"
            onClick={handleAuthorize}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleAuthorize();
              }
            }}
          >
            <ShieldAlertIcon />
            <AlertTitle>Authorization Required</AlertTitle>
            <AlertDescription>
              Click here to authorize this MCP server and access its tools.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="relative hidden sm:flex w-full">
        <CardContent className="flex min-w-0 w-full flex-row text-sm max-h-[320px] overflow-hidden border-r-0">
          <div className="w-1/2 min-w-0 flex flex-col pr-2 border-r border-border">
            <div className="flex items-center gap-2 mb-2 pt-2 pb-1 z-10">
              <Settings size={14} className="text-muted-foreground" />
              <h5 className="text-muted-foreground text-sm font-medium">
                {t("configuration")}
              </h5>
            </div>
            <div className="flex-1 overflow-y-auto">
              <JsonView data={config} />
            </div>
          </div>

          <div className="w-1/2 min-w-0 flex flex-col pl-4">
            <div className="flex items-center gap-2 mb-4 pt-2 pb-1 z-10">
              <Wrench size={14} className="text-muted-foreground" />
              <h5 className="text-muted-foreground text-sm font-medium">
                {t("availableTools")}
              </h5>
            </div>

            <div className="flex-1 overflow-y-auto">
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
      <AlertDescription className="whitespace-pre-wrap break-words">
        {error}
      </AlertDescription>
    </Alert>
  </div>
));

ErrorAlert.displayName = "ErrorAlert";
