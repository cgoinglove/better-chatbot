"use client";

import { appStore } from "@/app/store";
import { AllowedMCPServer, MCPServerInfo } from "app-types/mcp";
import { cn, objectFlow } from "lib/utils";
import {
  ArrowUpRightIcon,
  AtSign,
  ChartColumn,
  ChevronRight,
  CodeIcon,
  GlobeIcon,
  HardDriveUploadIcon,
  ImagesIcon,
  InfoIcon,
  Loader,
  MessageCircle,
  MousePointer2,
  Package,
  Plus,
  ShieldAlertIcon,
  Waypoints,
  Wrench,
  WrenchIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Checkbox } from "ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { Input } from "ui/input";
import { MCPIcon } from "ui/mcp-icon";

import { useTranslations } from "next-intl";

import { Switch } from "ui/switch";
import { useShallow } from "zustand/shallow";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import { useWorkflowToolList } from "@/hooks/queries/use-workflow-tool-list";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { WorkflowSummary } from "app-types/workflow";
import { WorkflowGreeting } from "./workflow/workflow-greeting";
import { AppDefaultToolkit } from "lib/ai/tools";
import { ChatMention } from "app-types/chat";
import { CountAnimation } from "ui/count-animation";

import { Separator } from "ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { AgentSummary } from "app-types/agent";
import { authClient } from "auth/client";

import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { safe } from "ts-safe";
import { mutate } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { useAgents } from "@/hooks/queries/use-agents";
import { redriectMcpOauth } from "lib/ai/mcp/oauth-redirect";
import { GeminiIcon } from "ui/gemini-icon";
import { useChatModels } from "@/hooks/queries/use-chat-models";
import { OpenAIIcon } from "ui/openai-icon";

interface ToolSelectDropdownProps {
  align?: "start" | "end" | "center";
  side?: "left" | "right" | "top" | "bottom";
  disabled?: boolean;
  mentions?: ChatMention[];
  onSelectWorkflow?: (workflow: WorkflowSummary) => void;
  onSelectAgent?: (agent: AgentSummary) => void;
  onGenerateImage?: (provider?: "google" | "openai") => void;
  className?: string;
}

const calculateToolCount = (
  allowedMcpServers: Record<string, AllowedMCPServer>,
  mcpList: (MCPServerInfo & { id: string })[],
) => {
  return mcpList.reduce((acc, server) => {
    const count = allowedMcpServers[server.id]?.tools?.length;
    return acc + count;
  }, 0);
};

export function ToolSelectDropdown({
  align,
  side,
  onSelectWorkflow,
  onSelectAgent,
  onGenerateImage,
  mentions,
  className,
}: ToolSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [toolChoice, allowedAppDefaultToolkit, allowedMcpServers, mcpList] =
    appStore(
      useShallow((state) => [
        state.toolChoice,
        state.allowedAppDefaultToolkit,
        state.allowedMcpServers,
        state.mcpList,
      ]),
    );

  const t = useTranslations("Chat.Tool");
  const { isLoading } = useMcpList();
  const { data: providers } = useChatModels();
  const [globalModel] = appStore(useShallow((state) => [state.chatModel]));

  const modelInfo = useMemo(() => {
    const provider = providers?.find(
      (provider) => provider.provider === globalModel?.provider,
    );
    const model = provider?.models.find(
      (model) => model.name === globalModel?.model,
    );
    return model;
  }, [providers, globalModel]);

  useWorkflowToolList({
    refreshInterval: 1000 * 60 * 5,
  });

  const agentMention = useMemo(() => {
    return mentions?.find((m) => m.type === "agent");
  }, [mentions]);

  const bindingTools = useMemo<string[]>(() => {
    if (mentions?.length) {
      return mentions.map((m) => m.name);
    }
    if (toolChoice == "none") return [];
    const translate = t.raw("defaultToolKit");
    const defaultTools = Object.values(AppDefaultToolkit)
      .filter((t) => allowedAppDefaultToolkit?.includes(t))
      .map((t) => translate[t]);
    const mcpIds = mcpList.map((v) => v.id);
    const mcpTools = Object.values(
      objectFlow(allowedMcpServers ?? {}).filter((_, id) =>
        mcpIds.includes(id),
      ),
    )
      .map((v) => v.tools)
      .flat();

    return [...defaultTools, ...mcpTools];
  }, [
    mentions,
    allowedAppDefaultToolkit,
    allowedMcpServers,
    toolChoice,
    mcpList,
  ]);

  const triggerButton = useMemo(() => {
    return (
      <Button
        variant="ghost"
        size={"sm"}
        className={cn(
          "gap-0.5 bg-input/60 border rounded-full data-[state=open]:bg-input! hover:bg-input!",
          !bindingTools.length &&
            !isLoading &&
            "text-muted-foreground bg-transparent border-transparent",
          isLoading && "bg-input/60",
          open && "bg-input!",
          className,
        )}
      >
        <span className={!bindingTools ? "text-muted-foreground" : ""}>
          {agentMention
            ? t("agent")
            : (mentions?.length ?? 0 > 0)
              ? t("mention")
              : t("tools")}
        </span>

        {((!agentMention && bindingTools.length > 0) || isLoading) && (
          <>
            <div className="h-4 hidden sm:block mx-1">
              <Separator orientation="vertical" />
            </div>

            <div className="min-w-5 flex justify-center">
              {isLoading ? (
                <Loader className="animate-spin size-3.5" />
              ) : (mentions?.length ?? 0) > 0 ? (
                <AtSign className="size-3.5" />
              ) : (
                <CountAnimation
                  number={bindingTools.length}
                  className="text-xs"
                />
              )}
            </div>
          </>
        )}
      </Button>
    );
  }, [mentions?.length, bindingTools.length, isLoading, open]);

  useEffect(() => {
    if (bindingTools.length > 128) {
      toast(t("tooManyToolsSelected"));
    }
  }, [bindingTools.length > 128]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div>
          <Tooltip>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent align={align} side={side} className="p-4 text-xs  ">
              <div className="flex items-center gap-2">
                <WrenchIcon className="size-3.5" />
                <span className="text-sm">{t("toolsSetup")}</span>
              </div>

              <p className="text-muted-foreground mt-4 whitespace-pre-wrap">
                {t("toolsSetupDescription")}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="md:w-72" align={align} side={side}>
        <WorkflowToolSelector onSelectWorkflow={onSelectWorkflow} />
        <div className="py-1">
          <DropdownMenuSeparator />
        </div>
        <AgentSelector onSelectAgent={onSelectAgent} />
        <div className="py-1">
          <DropdownMenuSeparator />
        </div>
        <ImageGeneratorSelector
          onGenerateImage={onGenerateImage}
          modelInfo={modelInfo}
        />
        <div className="py-1">
          <DropdownMenuSeparator />
        </div>
        <div className="py-2">
          <ToolPresets />
          <div className="py-1">
            <DropdownMenuSeparator />
          </div>
          <AppDefaultToolKitSelector />
          <div className="py-1">
            <DropdownMenuSeparator />
          </div>
          <McpServerSelector />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolPresets() {
  const [
    appStoreMutate,
    presets,
    allowedMcpServers,
    allowedAppDefaultToolkit,
    mcpList,
  ] = appStore(
    useShallow((state) => [
      state.mutate,
      state.toolPresets,
      state.allowedMcpServers,
      state.allowedAppDefaultToolkit,
      state.mcpList,
    ]),
  );
  const [open, setOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const t = useTranslations();

  const presetWithToolCount = useMemo(() => {
    return presets.map((preset) => ({
      ...preset,
      toolCount: calculateToolCount(preset.allowedMcpServers ?? {}, mcpList),
    }));
  }, [presets, mcpList]);

  const addPreset = useCallback(
    (name: string) => {
      if (name.trim() === "") {
        toast.error(t("Chat.Tool.presetNameCannotBeEmpty"));
        return;
      }
      if (presets.find((p) => p.name === name)) {
        toast.error(t("Chat.Tool.presetNameAlreadyExists"));
        return;
      }
      appStoreMutate((prev) => {
        return {
          toolPresets: [
            ...prev.toolPresets,
            { name, allowedMcpServers, allowedAppDefaultToolkit },
          ],
        };
      });
      setPresetName("");
      setOpen(false);
      toast.success(t("Chat.Tool.presetSaved"));
    },
    [allowedMcpServers, allowedAppDefaultToolkit, presets],
  );

  const deletePreset = useCallback((index: number) => {
    appStoreMutate((prev) => {
      return {
        toolPresets: prev.toolPresets.filter((_, i) => i !== index),
      };
    });
  }, []);

  const applyPreset = useCallback((preset: (typeof presets)[number]) => {
    appStoreMutate({
      allowedMcpServers: preset.allowedMcpServers,
      allowedAppDefaultToolkit: preset.allowedAppDefaultToolkit,
    });
  }, []);

  return (
    <DropdownMenuGroup className="cursor-pointer">
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-xs flex items-center gap-2 font-semibold cursor-pointer">
          <Package className="size-3.5" />
          {t("Chat.Tool.preset")}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="md:w-80 md:max-h-96 overflow-y-auto">
            <DropdownMenuLabel className="flex items-center text-muted-foreground gap-2 text-xs">
              {t("Chat.Tool.toolPresets")}
              <div className="flex-1" />
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant={"secondary"} size={"sm"} className="text-xs">
                    {t("Chat.Tool.saveAsPreset")}
                    <Plus className="size-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("Chat.Tool.saveAsPreset")}</DialogTitle>
                  </DialogHeader>
                  <DialogDescription>
                    {t("Chat.Tool.saveAsPresetDescription")}
                  </DialogDescription>
                  <Input
                    placeholder={t("Chat.Tool.presetNamePlaceholder")}
                    value={presetName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        addPreset(presetName);
                      }
                    }}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                  <Button
                    variant={"secondary"}
                    size={"sm"}
                    className="border"
                    onClick={() => {
                      addPreset(presetName);
                    }}
                  >
                    {t("Common.save")}
                  </Button>
                </DialogContent>
              </Dialog>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {presets.length === 0 ? (
              <div className="text-sm text-muted-foreground w-full h-full flex flex-col items-center justify-center gap-2 py-6">
                <p>{t("Chat.Tool.noPresetsAvailableYet")}</p>
                <p className="text-xs px-4">
                  {t("Chat.Tool.clickSaveAsPresetToGetStarted")}
                </p>
              </div>
            ) : (
              presetWithToolCount.map((preset, index) => {
                return (
                  <DropdownMenuItem
                    onClick={() => {
                      applyPreset(preset);
                    }}
                    key={preset.name}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Badge
                      variant={"secondary"}
                      className="rounded-full border-input"
                    >
                      <Wrench className="size-3.5" />
                      <span className="min-w-6 text-center">
                        {preset.toolCount}
                      </span>
                    </Badge>
                    <span className="font-semibold truncate">
                      {preset.name}
                    </span>

                    <div className="flex-1" />
                    <div
                      className="p-1 hover:bg-input rounded-full cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        deletePreset(index);
                      }}
                    >
                      <X className="size-3.5" />
                    </div>
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}

function WorkflowToolSelector({
  onSelectWorkflow,
}: {
  onSelectWorkflow?: (workflow: WorkflowSummary) => void;
}) {
  const t = useTranslations();
  const workflowToolList = appStore((state) => state.workflowToolList);
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  // Separate user's workflows from shared workflows
  const myWorkflows = workflowToolList.filter(
    (w) => w.userId === currentUserId,
  );
  const sharedWorkflows = workflowToolList.filter(
    (w) => w.userId !== currentUserId,
  );
  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-xs flex items-center gap-2 font-semibold cursor-pointer">
          <Waypoints className="size-3.5" />
          {t("Workflow.title")}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-80 relative">
            {myWorkflows.length === 0 && sharedWorkflows.length === 0 ? (
              <div className="text-sm text-muted-foreground flex flex-col py-6 px-6 gap-4 items-center">
                <InfoIcon className="size-4" />
                <p className="whitespace-pre-wrap">{t("Workflow.noTools")}</p>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant={"ghost"} className="relative group">
                      {t("Workflow.whatIsWorkflow")}
                      <div className="absolute left-0 -top-1.5 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                        <MousePointer2 className="rotate-180 text-blue-500 fill-blue-500 size-3 wiggle" />
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="md:max-w-3xl!">
                    <DialogTitle className="sr-only">
                      workflow greeting
                    </DialogTitle>
                    <WorkflowGreeting />
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <>
                {/* My Workflows */}
                {myWorkflows.map((workflow) => (
                  <DropdownMenuItem
                    key={workflow.id}
                    className="cursor-pointer"
                    onClick={() => onSelectWorkflow?.(workflow)}
                  >
                    {workflow.icon && workflow.icon.type === "emoji" ? (
                      <div
                        style={{
                          backgroundColor:
                            workflow.icon?.style?.backgroundColor,
                        }}
                        className="p-1 rounded flex items-center justify-center ring ring-background border"
                      >
                        <Avatar className="size-3">
                          <AvatarImage src={workflow.icon?.value} />
                          <AvatarFallback>
                            {workflow.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : null}
                    <span className="truncate min-w-0">{workflow.name}</span>
                  </DropdownMenuItem>
                ))}

                {myWorkflows.length > 0 && sharedWorkflows.length > 0 && (
                  <DropdownMenuSeparator />
                )}

                {/* Shared Workflows */}
                {sharedWorkflows.map((workflow) => (
                  <DropdownMenuItem
                    key={workflow.id}
                    className="cursor-pointer"
                    onClick={() => onSelectWorkflow?.(workflow)}
                  >
                    {workflow.icon && workflow.icon.type === "emoji" ? (
                      <div
                        style={{
                          backgroundColor:
                            workflow.icon?.style?.backgroundColor,
                        }}
                        className="p-1 rounded flex items-center justify-center ring ring-background border"
                      >
                        <Avatar className="size-3">
                          <AvatarImage src={workflow.icon?.value} />
                          <AvatarFallback>
                            {workflow.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate min-w-0">{workflow.name}</span>
                      {workflow.userName && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="size-4 ml-2 shrink-0">
                              <AvatarImage src={workflow.userAvatar} />
                              <AvatarFallback className="text-xs text-muted-foreground font-medium">
                                {workflow.userName[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("Common.sharedBy", {
                              userName: workflow.userName,
                            })}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}

function McpServerSelector() {
  const t = useTranslations("Chat.Tool");
  const [appStoreMutate, allowedMcpServers, mcpServerList] = appStore(
    useShallow((state) => [
      state.mutate,
      state.allowedMcpServers,
      state.mcpList,
    ]),
  );

  const selectedMcpServerList = useMemo(() => {
    if (mcpServerList.length === 0) return [];
    return [...mcpServerList]
      .sort(
        (a, b) =>
          (a.status === "connected" ? -1 : 1) -
          (b.status === "connected" ? -1 : 1),
      )
      .map((server) => {
        const allowedTools: string[] =
          allowedMcpServers?.[server.id]?.tools ?? [];

        return {
          id: server.id,
          serverName: server.name,
          checked: allowedTools.length > 0,
          tools: server.toolInfo.map((tool) => ({
            name: tool.name,
            checked: allowedTools.includes(tool.name),
            description: tool.description,
          })),
          error: server.error,
          status: server.status,
        };
      });
  }, [mcpServerList, allowedMcpServers]);

  const setMcpServerTool = useCallback(
    (serverId: string, toolNames: string[]) => {
      appStoreMutate((prev) => {
        return {
          allowedMcpServers: {
            ...prev.allowedMcpServers,
            [serverId]: {
              ...(prev.allowedMcpServers?.[serverId] ?? {}),
              tools: toolNames,
            },
          },
        };
      });
    },
    [],
  );
  return (
    <DropdownMenuGroup>
      {!selectedMcpServerList.length ? (
        <div className="text-sm text-muted-foreground w-full h-full flex flex-col items-center justify-center py-6">
          <div>{t("noMcpServersDetected")}</div>
          <Link href="/mcp">
            <Button
              variant={"ghost"}
              className="mt-2 text-primary flex items-center gap-1"
            >
              {t("addServer")} <ChevronRight className="size-4" />
            </Button>
          </Link>
        </div>
      ) : (
        selectedMcpServerList.map((server) => (
          <DropdownMenuSub key={server.id}>
            <DropdownMenuSubTrigger
              className="flex items-center gap-2 font-semibold cursor-pointer"
              icon={
                <div className="flex items-center gap-2 ml-auto">
                  {server.status === "authorizing" ? (
                    <div className="flex items-center gap-1">
                      <ShieldAlertIcon className="size-3 text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {server.tools.filter((t) => t.checked).length > 0 ? (
                        <span className="w-5 h-5 items-center justify-center flex text-[8px] text-muted-foreground font-semibold ">
                          {server.tools.filter((t) => t.checked).length}
                        </span>
                      ) : null}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </>
                  )}
                </div>
              }
              onClick={(e) => {
                e.preventDefault();
                setMcpServerTool(
                  server.id,
                  server.checked ? [] : server.tools.map((t) => t.name),
                );
              }}
            >
              <div className="flex items-center justify-center p-1 rounded bg-input/40 border">
                <MCPIcon className="fill-foreground size-2.5" />
              </div>

              <span className={cn("truncate", !server.checked && "opacity-30")}>
                {server.serverName}
              </span>
              {Boolean(server.error) ? (
                <span
                  className={cn("text-xs text-destructive ml-1 p-1 rounded")}
                >
                  {t("error")}
                </span>
              ) : null}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-80 relative">
                <McpServerToolSelector
                  tools={server.tools}
                  isAuthorizing={server.status === "authorizing"}
                  checked={server.checked}
                  serverId={server.id}
                  onClickAllChecked={(checked) => {
                    setMcpServerTool(
                      server.id,
                      checked ? server.tools.map((t) => t.name) : [],
                    );
                  }}
                  onToolClick={(toolName, checked) => {
                    const currentTools = server.tools
                      .filter((v) => v.checked)
                      .map((v) => v.name);

                    setMcpServerTool(
                      server.id,
                      checked
                        ? currentTools.concat(toolName)
                        : currentTools.filter((v) => v !== toolName),
                    );
                  }}
                />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        ))
      )}
    </DropdownMenuGroup>
  );
}

interface McpServerToolSelectorProps {
  tools: {
    name: string;
    checked: boolean;
    description: string;
  }[];
  isAuthorizing: boolean;
  serverId: string;
  onClickAllChecked: (checked: boolean) => void;
  checked: boolean;
  onToolClick: (toolName: string, checked: boolean) => void;
}
function McpServerToolSelector({
  tools,
  serverId,
  onClickAllChecked,
  isAuthorizing,
  checked,
  onToolClick,
}: McpServerToolSelectorProps) {
  const t = useTranslations("Common");
  const tTool = useTranslations("Chat.Tool");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const filteredTools = useMemo(() => {
    return tools.filter((tool) =>
      tool.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [tools, search]);

  const handleAuthorize = useCallback(
    () =>
      safe(() => setLoading(true))
        .map(() => redriectMcpOauth(serverId))
        .ifOk(() => mutate("/api/mcp/list"))
        .ifFail(handleErrorWithToast)
        .watch(() => setLoading(false)),

    [serverId],
  );

  if (isAuthorizing) {
    return (
      <Alert
        className="cursor-pointer hover:bg-accent/10 transition-colors border-none"
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
        {loading ? <Loader className="animate-spin" /> : <ShieldAlertIcon />}

        <AlertTitle>{tTool("authorizationRequired")}</AlertTitle>
        <AlertDescription>{tTool("clickToAuthorize")}</AlertDescription>
      </Alert>
    );
  }
  return (
    <div>
      <DropdownMenuLabel
        className="text-muted-foreground flex items-center gap-2"
        onClick={(e) => {
          e.preventDefault();
          onClickAllChecked(!checked);
        }}
      >
        <input
          autoFocus
          placeholder={t("search")}
          value={search}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          onChange={(e) => setSearch(e.target.value)}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="placeholder:text-muted-foreground flex w-full text-xs   outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex-1" />
        <Switch checked={checked} />
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <div className="max-h-96 overflow-y-auto">
        {filteredTools.length === 0 ? (
          <div className="text-sm text-muted-foreground w-full h-full flex items-center justify-center py-6">
            {t("noResults")}
          </div>
        ) : (
          filteredTools.map((tool) => (
            <DropdownMenuItem
              key={tool.name}
              className="flex items-center gap-2 cursor-pointer mb-1"
              onClick={(e) => {
                e.preventDefault();
                onToolClick(tool.name, !tool.checked);
              }}
            >
              <div className="mx-1 flex-1 min-w-0">
                <p className="font-medium text-xs mb-1 truncate">{tool.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {tool.description}
                </p>
              </div>
              <Checkbox checked={tool.checked} className="ml-auto" />
            </DropdownMenuItem>
          ))
        )}
      </div>
    </div>
  );
}

function AppDefaultToolKitSelector() {
  const [appStoreMutate, allowedAppDefaultToolkit] = appStore(
    useShallow((state) => [state.mutate, state.allowedAppDefaultToolkit]),
  );
  const t = useTranslations();
  const toggleAppDefaultToolkit = useCallback((toolkit: AppDefaultToolkit) => {
    appStoreMutate((prev) => {
      const newAllowedAppDefaultToolkit = [
        ...(prev.allowedAppDefaultToolkit ?? []),
      ];
      if (newAllowedAppDefaultToolkit.includes(toolkit)) {
        newAllowedAppDefaultToolkit.splice(
          newAllowedAppDefaultToolkit.indexOf(toolkit),
          1,
        );
      } else {
        newAllowedAppDefaultToolkit.push(toolkit);
      }
      return { allowedAppDefaultToolkit: newAllowedAppDefaultToolkit };
    });
  }, []);

  const defaultToolInfo = useMemo(() => {
    const raw = t.raw("Chat.Tool.defaultToolKit");
    return Object.values(AppDefaultToolkit).map((toolkit) => {
      const label = raw[toolkit] || toolkit;
      const id = toolkit;
      let icon = Wrench;
      switch (toolkit) {
        case AppDefaultToolkit.Visualization:
          icon = ChartColumn;
          break;
        case AppDefaultToolkit.WebSearch:
          icon = GlobeIcon;
          break;
        case AppDefaultToolkit.Http:
          icon = HardDriveUploadIcon;
          break;
        case AppDefaultToolkit.Code:
          icon = CodeIcon;
          break;
      }
      return {
        label,
        id,
        icon,
      };
    });
  }, []);

  return (
    <DropdownMenuGroup>
      {defaultToolInfo.map((tool) => {
        return (
          <DropdownMenuItem
            key={tool.id}
            className={cn(
              "cursor-pointer font-semibold text-xs text-muted-foreground",
              allowedAppDefaultToolkit?.includes(tool.id) && "text-foreground",
            )}
            onClick={(e) => {
              e.preventDefault();
              toggleAppDefaultToolkit(tool.id);
            }}
          >
            <tool.icon
              className={cn(
                "size-3.5",
                allowedAppDefaultToolkit?.includes(tool.id) &&
                  "text-foreground",
              )}
            />
            {tool.label}
            <Switch
              className="ml-auto"
              checked={allowedAppDefaultToolkit?.includes(tool.id)}
            />
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuGroup>
  );
}

function AgentSelector({
  onSelectAgent,
}: {
  onSelectAgent?: (agent: AgentSummary) => void;
}) {
  const t = useTranslations();
  const { myAgents, bookmarkedAgents } = useAgents({
    filters: ["mine", "bookmarked"],
  });

  const emptyAgent = useMemo(() => {
    if (myAgents.length + bookmarkedAgents.length > 0) return null;
    return (
      <Link
        href={"/agent/new"}
        className="py-8 px-4 hover:bg-input/100 rounded-lg cursor-pointer flex justify-between items-center text-xs overflow-hidden"
      >
        <div className="gap-1 z-10">
          <div className="flex items-center mb-4 gap-1">
            <p className="font-semibold">{t("Layout.createAgent")}</p>
            <ArrowUpRightIcon className="size-3" />
          </div>
          <p className="text-muted-foreground">
            {bookmarkedAgents.length > 0
              ? t("Layout.createYourOwnAgentOrSelectShared")
              : t("Layout.createYourOwnAgent")}
          </p>
        </div>
      </Link>
    );
  }, [myAgents.length, bookmarkedAgents.length, t]);

  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-xs flex items-center gap-2 font-semibold cursor-pointer">
          <MessageCircle className="size-3.5" />
          {t("Agent.title")}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-80 relative">
            {emptyAgent}

            {/* My Agents */}
            {myAgents.map((agent) => (
              <DropdownMenuItem
                key={agent.id}
                className="cursor-pointer"
                onClick={() => onSelectAgent?.(agent)}
              >
                {agent.icon && agent.icon.type === "emoji" ? (
                  <div
                    style={{
                      backgroundColor: agent.icon?.style?.backgroundColor,
                    }}
                    className="p-1 rounded flex items-center justify-center ring ring-background border"
                  >
                    <Avatar className="size-3">
                      <AvatarImage src={agent.icon?.value} />
                      <AvatarFallback>{agent.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                  </div>
                ) : null}
                <span className="truncate min-w-0">{agent.name}</span>
              </DropdownMenuItem>
            ))}

            {myAgents.length > 0 && bookmarkedAgents.length > 0 && (
              <DropdownMenuSeparator />
            )}

            {bookmarkedAgents.map((agent) => (
              <DropdownMenuItem
                key={agent.id}
                className="cursor-pointer"
                onClick={() => onSelectAgent?.(agent)}
              >
                {agent.icon && agent.icon.type === "emoji" ? (
                  <div
                    style={{
                      backgroundColor: agent.icon?.style?.backgroundColor,
                    }}
                    className="p-1 rounded flex items-center justify-center ring ring-background border"
                  >
                    <Avatar className="size-3">
                      <AvatarImage src={agent.icon?.value} />
                      <AvatarFallback>{agent.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                  </div>
                ) : null}
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate min-w-0">{agent.name}</span>
                  {agent.userName && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="size-4 ml-2 shrink-0">
                          <AvatarImage src={agent.userAvatar} />
                          <AvatarFallback className="text-xs text-muted-foreground font-medium">
                            {agent.userName[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("Common.sharedBy", { userName: agent.userName })}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}

function ImageGeneratorSelector({
  onGenerateImage,
  modelInfo,
}: {
  onGenerateImage?: (provider?: "google" | "openai") => void;
  modelInfo?: { isToolCallUnsupported?: boolean };
}) {
  const t = useTranslations("Chat");

  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-xs flex items-center gap-2 font-semibold cursor-pointer">
          <ImagesIcon className="size-3.5" />
          {t("generateImage")}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              disabled={modelInfo?.isToolCallUnsupported}
              onClick={() => onGenerateImage?.("google")}
              className="cursor-pointer"
            >
              <GeminiIcon className="mr-2 size-4" />
              Gemini (Nano Banana)
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={modelInfo?.isToolCallUnsupported}
              onClick={() => onGenerateImage?.("openai")}
              className="cursor-pointer"
            >
              <OpenAIIcon className="mr-2 size-4" />
              OpenAI
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}
