"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";

import useSWR from "swr";
import { cn, fetcher } from "lib/utils";

import { useTranslations } from "next-intl";
import {
  McpServerCustomization,
  MCPServerInfo,
  McpToolCustomization,
} from "app-types/mcp";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { ChevronRight, Info, Loader, Trash2, Wrench } from "lucide-react";
import { Button } from "ui/button";
import { Textarea } from "ui/textarea";
import { safe } from "ts-safe";
import { z } from "zod";
import { handleErrorWithToast } from "ui/shared-toast";
import { Skeleton } from "ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { ToolDetailPopup } from "./tool-detail-popup";
import { ExamplePlaceholder } from "ui/example-placeholder";

interface McpCustomizationPopupProps {
  mcpServerInfo: MCPServerInfo & { id: string };
  children: ReactNode;
}

export function McpCustomizationPopup(props: McpCustomizationPopupProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] fixed p-10 overflow-hidden">
        <McpServerCustomizationContent mcpServerInfo={props.mcpServerInfo} />
      </DialogContent>
    </Dialog>
  );
}

function McpServerCustomizationContent({
  mcpServerInfo: { id, name, toolInfo, error },
}: { mcpServerInfo: MCPServerInfo & { id: string } }) {
  const t = useTranslations();

  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = () => {
    setIsProcessing(true);
    safe(() =>
      z
        .object({
          prompt: z.string().min(1).max(3000),
        })
        .parse({
          prompt,
        }),
    )
      .map((body) =>
        fetch(`/api/mcp/server-customizations/${id}`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      )
      .ifOk(() => refreshMcpServerCustomization())
      .ifFail(handleErrorWithToast)
      .watch(() => {
        setIsProcessing(false);
      });
  };

  const handleDelete = () => {
    setIsProcessing(true);
    safe(() =>
      fetch(`/api/mcp/server-customizations/${id}`, {
        method: "DELETE",
      }),
    )
      .ifOk(() => refreshMcpServerCustomization())
      .ifFail(handleErrorWithToast)
      .watch(() => {
        setIsProcessing(false);
      });
  };

  const {
    data: mcpServerCustomization,
    mutate: refreshMcpServerCustomization,
    isLoading: isLoadingMcpServerCustomization,
  } = useSWR<null | McpServerCustomization>(
    `/api/mcp/server-customizations/${id}`,
    fetcher,
    {
      onSuccess: (data) => {
        setPrompt(data?.prompt || "");
      },
      revalidateOnFocus: false,
    },
  );

  const {
    data: mcpToolCustomizations,
    mutate: refreshMcpToolCustomizations,
    isLoading: isLoadingMcpToolCustomizations,
  } = useSWR<McpToolCustomization[]>(
    `/api/mcp/tool-customizations/${id}`,
    fetcher,
    {
      fallbackData: [],
    },
  );

  const toolCustomizations = useMemo(() => {
    const mcpToolCustomizationsMap = new Map(
      mcpToolCustomizations?.map((tool) => [tool.toolName, tool]),
    );
    return toolInfo.map((tool) => {
      return {
        name: tool.name,
        description: tool.description,
        prompt: mcpToolCustomizationsMap.get(tool.name)?.prompt || "",
        id: mcpToolCustomizationsMap.get(tool.name)?.id || null,
      };
    });
  }, [mcpToolCustomizations, toolInfo]);

  return (
    <div className="flex flex-col h-full">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 mb-2">
          {name}

          {error ? <p className="text-xs text-destructive">error</p> : null}
        </DialogTitle>
        <DialogDescription>{/*  */}</DialogDescription>
        <div className="flex items-center">
          <h5 className="mr-auto flex items-center py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-medium flex-1 flex items-center text-muted-foreground">
                  {t("MCP.mcpServerCustomization")}
                  <Info className="size-3 ml-1 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="whitespace-pre-wrap">
                  {t("MCP.mcpServerCustomizationDescription")}
                </p>
              </TooltipContent>
            </Tooltip>
          </h5>
          {isProcessing || isLoadingMcpServerCustomization ? (
            <Button size="icon" variant="ghost">
              <Loader className="size-3 animate-spin" />
            </Button>
          ) : (
            <>
              {mcpServerCustomization?.id && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handleDelete}>
                      <Trash2 className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("Common.delete")}</TooltipContent>
                </Tooltip>
              )}
              {prompt != (mcpServerCustomization?.prompt || "") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" size="sm" onClick={handleSave}>
                      {t("Common.save")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("Common.edit")}</TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>
        <div className="relative">
          <Textarea
            readOnly={isProcessing || isLoadingMcpServerCustomization}
            className={cn("resize-none h-20 overflow-y-auto w-full")}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          {!prompt && (
            <div className="absolute left-0 top-0 w-full px-4 py-2 pointer-events-none">
              <ExamplePlaceholder
                placeholder={[t("MCP.mcpServerCustomizationPlaceholder")]}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 mt-4">
          <div className="text-xs flex items-center text-muted-foreground w-fit">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-medium flex-1 flex items-center text-muted-foreground">
                  {t("MCP.additionalInstructions")}
                  <Info className="size-3 ml-1 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="whitespace-pre-wrap">
                  {t("MCP.toolCustomizationInstructions")}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {isLoadingMcpToolCustomizations ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh]">
              {toolCustomizations.length === 0 ? (
                <Alert className="cursor-pointer py-8">
                  <Wrench className="size-3.5" />
                  <div className="flex w-full gap-2 items-center">
                    <div className="flex-1 min-w-0">
                      <AlertTitle>{t("MCP.noToolsAvailable")}</AlertTitle>
                    </div>
                  </div>
                </Alert>
              ) : (
                toolCustomizations.map((tool) => {
                  return (
                    <ToolDetailPopup
                      tool={tool}
                      serverId={id}
                      key={tool.name}
                      onUpdate={refreshMcpToolCustomizations}
                    >
                      <Alert
                        key={tool.name}
                        className="cursor-pointer hover:bg-input"
                      >
                        <Wrench className="size-3.5" />
                        <div className="flex w-full gap-2 items-center">
                          <div className="flex-1 min-w-0">
                            <AlertTitle>{tool.name}</AlertTitle>
                            <AlertDescription className="flex gap-2 w-full min-w-0 items-start">
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap break-all line-clamp-3">
                                {tool.prompt ||
                                  t(
                                    "MCP.toolCustomizationInstructionsPlaceholder",
                                  )}
                              </p>
                            </AlertDescription>
                          </div>
                          <ChevronRight className="size-3.5 flex-shrink-0" />
                        </div>
                      </Alert>
                    </ToolDetailPopup>
                  );
                })
              )}
            </div>
          )}
        </div>
      </DialogHeader>
    </div>
  );
}
