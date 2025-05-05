"use client";

import { PropsWithChildren, useState, useMemo, useEffect } from "react";
import {
  rememberMcpBindingAction,
  saveMcpServerBindingsAction,
} from "@/app/api/chat/actions";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { MCPServerBinding, MCPServerBindingConfig } from "app-types/mcp";
import { appStore } from "@/app/store";
import useSWR from "swr";
import { selectMcpClientsAction } from "@/app/api/mcp/actions";
import { handleErrorWithToast } from "ui/shared-toast";
import equal from "fast-deep-equal";
import { Button } from "ui/button";
import { Skeleton } from "ui/skeleton";
import { ChevronRightIcon, Info, Loader, WrenchIcon } from "lucide-react";
import { capitalizeFirstLetter, cn } from "lib/utils";
import { Card, CardContent, CardFooter } from "ui/card";
import { MCPIcon } from "ui/mcp-icon";
import { Separator } from "ui/separator";
import { Switch } from "ui/switch";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { signOut } from "next-auth/react";

interface MCPServerBindingProps {
  ownerId: string;
  ownerType: MCPServerBinding["ownerType"];
  onSave?: () => void;
  align?: "start" | "end" | "center";
  side?: "left" | "right" | "top" | "bottom";
}

export const MCPServerBindingSelector = (
  props: PropsWithChildren<MCPServerBindingProps>,
) => {
  const appStoreMutate = appStore((state) => state.mutate);

  const [expanded, setExpanded] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  const [config, setConfig] = useState<null | MCPServerBindingConfig>(null);

  const { data: storedConfig, mutate: mutatestoredConfig } = useSWR(
    `/mcp-binding/${props.ownerId}/${props.ownerType}`,
    async () => {
      if (!props.ownerId) return null;
      return rememberMcpBindingAction(props.ownerId, props.ownerType);
    },
    {
      onError: () => {
        signOut();
      },
    },
  );

  const { data: mcpServerList, isLoading } = useSWR(
    "mcp-list",
    selectMcpClientsAction,
    {
      refreshInterval: 1000 * 60 * 1,
      onError: handleErrorWithToast,
      onSuccess: (data) => {
        appStoreMutate({ mcpList: data });
      },
    },
  );

  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    if (!mcpServerList) return [];
    return mcpServerList.map((server) => {
      const allowedTools: string[] = config
        ? (config?.[server.name]?.allowedTools ?? [])
        : server.toolInfo.map((tool) => tool.name);
      return {
        id: server.name,
        serverName: server.name,
        checked: allowedTools.length > 0,
        tools: server.toolInfo.map((tool) => ({
          name: tool.name,
          checked: allowedTools.includes(tool.name),
          description: tool.description,
        })),
        status: server.error ? "error" : server.status,
      };
    });
  }, [config, mcpServerList]);

  const handleToggleMcp = (serverName: string) => {
    const newTools = items.find((item) => item.id === serverName)?.checked
      ? []
      : items
          .find((item) => item.id === serverName)
          ?.tools.map((tool) => tool.name);

    setConfig({
      ...config,
      [serverName]: {
        serverName,
        allowedTools: newTools ?? [],
      },
    });
  };

  const handleToggleTool = (serverName: string, tool: string) => {
    const tools = config?.[serverName]?.allowedTools ?? [];
    const newTools = tools.includes(tool)
      ? tools.filter((t) => t !== tool)
      : [...tools, tool];
    setConfig({
      ...config,
      [serverName]: {
        serverName,
        allowedTools: newTools,
      },
    });
  };

  const handleSave = async () => {
    if (!props.ownerId) {
      toast.error("Owner ID is required");
      return;
    }
    setIsSaving(true);

    await saveMcpServerBindingsAction({
      ownerId: props.ownerId,
      ownerType: props.ownerType,
      config: config ?? {},
    })
      .then(() => toast.success("Saved"))
      .catch(handleErrorWithToast)
      .finally(() => {
        mutatestoredConfig();
        setIsSaving(false);
        setOpen(false);
      });

    props.onSave?.();
  };

  const handleToggleExpanded = (mcpId: string) => {
    setExpanded((prev) =>
      prev.includes(mcpId)
        ? prev.filter((id) => id !== mcpId)
        : [...prev, mcpId],
    );
  };

  const isDiff = useMemo(() => {
    return !equal(storedConfig, config);
  }, [config, storedConfig]);

  useEffect(() => {
    if (storedConfig) {
      setConfig(storedConfig);
    } else {
      const allCheckConfig = mcpServerList?.reduce((acc, server) => {
        acc[server.name] = {
          serverName: server.name,
          allowedTools: server.toolInfo.map((tool) => tool.name),
        };
        return acc;
      }, {}) as MCPServerBindingConfig;
      setConfig(allCheckConfig);
    }
  }, [storedConfig, mcpServerList]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {props.children || (
          <Button
            variant={"outline"}
            className="rounded-full bg-secondary font-semibold"
          >
            <MCPIcon className="size-3.5 fill-muted-foreground" />
            MCP Server
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="p-0 border-none  w-full md:w-[440px]"
        align={props.align}
        side={props.side}
      >
        <Card
          className="relative w-full py-0 overflow-hidden gap-0!"
          onClick={(e) => e.stopPropagation()}
        >
          <CardContent className="p-0 flex">
            <div className="flex-1 w-full">
              <div className="p-4 bg-card">
                <div className="flex items-center gap-1 px-2">
                  <MCPIcon className="size-4 mr-1 fill-foreground" />
                  <h4 className="text-lg font-semibold flex items-center gap-2 w-full">
                    MCP Server Binding
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="ml-auto text-sm text-muted-foreground flex items-center gap-1">
                          <Info className="size-4 text-muted-foreground ml-auto" />
                          {capitalizeFirstLetter(props.ownerType)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {props.ownerType === "project" ? (
                          <ProjectInfo />
                        ) : (
                          <ThreadInfo />
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </h4>
                </div>
              </div>
              <div className="flex flex-col h-[40vh] overflow-y-auto w-full">
                {isLoading ? (
                  <div className="flex flex-col gap-4 p-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-sm text-muted-foreground w-full h-full flex items-center justify-center">
                    No MCP servers found.
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className={cn("px-4 py-2")}>
                      <div className="hover:bg-input flex flex-col w-full rounded-lg bg-secondary border overflow-hidden">
                        <div
                          className="flex items-center gap-2 w-full cursor-pointer p-5 transition-colors"
                          onClick={() => handleToggleExpanded(item.id)}
                        >
                          <span
                            className={cn(
                              "font-semibold truncate",
                              !item.checked && "text-muted-foreground",
                            )}
                          >
                            {item.serverName}
                          </span>
                          {item.status !== "connected" && (
                            <span
                              className={cn(
                                "text-xs",
                                item.status == "error"
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                              )}
                            >
                              {item.status}
                            </span>
                          )}
                          <div className="flex-1" />
                          <span className="text-xs text-muted-foreground">
                            {item.tools.length} tools
                          </span>
                          <div className="h-4 mx-2">
                            <Separator orientation="vertical" />
                          </div>

                          <Switch
                            checked={item.checked}
                            className="hover:scale-110"
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => handleToggleMcp(item.id)}
                          />

                          <div className="h-4 pl-1 mx-2">
                            <Separator orientation="vertical" />
                          </div>
                          <ChevronRightIcon
                            className={cn(
                              "size-4 transition-transform duration-200",
                              expanded.includes(item.id) ? "rotate-90" : "",
                            )}
                          />
                        </div>
                        {expanded.includes(item.id) && (
                          <div className="pb-4">
                            {item.tools.map((tool) => (
                              <div
                                key={tool.name}
                                className={
                                  "cursor-pointer px-8  p-2 flex items-center gap-2 hover:bg-input transition-colors"
                                }
                                onClick={() =>
                                  handleToggleTool(item.id, tool.name)
                                }
                              >
                                <WrenchIcon className="size-4 text-muted-foreground" />
                                <div className="mx-1 flex-1">
                                  <p className="font-medium text-xs mb-1">
                                    {tool.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {tool.description}
                                  </p>
                                </div>
                                <Checkbox
                                  checked={tool.checked}
                                  className="ml-auto"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="py-2! flex justify-end border-t">
            <Button
              onClick={handleSave}
              className="font-semibold"
              disabled={!isDiff}
            >
              {isSaving ? <Loader className="size-4 animate-spin" /> : "Apply"}
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

function ThreadInfo() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-foreground mb-4">
        MCP Server Binding
      </h1>
      <p className="text-sm leading-snug text-muted-foreground">
        Once applied, this chat thread will only have access to the
        <br />
        <span className="text-primary font-medium">
          selected MCP servers and their tools
        </span>
        .<br />
        <br />
        You can
        <span className="text-primary font-medium">
          {" "}
          enable an entire server
        </span>{" "}
        to use all of its tools,
        <br />
        or
        <span className="text-primary font-medium"> pick individual tools</span>{" "}
        if you want finer control.
      </p>
    </div>
  );
}

function ProjectInfo() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-foreground mb-4">
        MCP Project Preset
      </h1>
      <p className="text-sm leading-snug text-muted-foreground">
        This preset defines which MCP servers and tools are available
        <br />
        for any chat thread created under this project.
        <br />
        <br />
        You can
        <span className="text-primary font-medium"> enable full servers</span>{" "}
        to allow all tools,
        <br />
        or
        <span className="text-primary font-medium">
          {" "}
          choose tools individually
        </span>{" "}
        to tailor the setup.
        <br />
        <br />
        Threads created from this project will
        <span className="text-primary font-medium"> automatically apply</span>{" "}
        this configuration.
      </p>
    </div>
  );
}
