import { appStore } from "@/app/store";
import { AllowedMCPServer, MCPServerInfo } from "app-types/mcp";
import { cn, objectFlow } from "lib/utils";
import {
  AtSign,
  ChartColumn,
  Check,
  ChevronRight,
  ClipboardCheck,
  CodeIcon,
  HardDriveUploadIcon,
  Infinity,
  InfoIcon,
  Loader,
  MousePointer2,
  Package,
  PenOffIcon,
  Plus,
  Settings2Icon,
  Waypoints,
  Wrench,
  WrenchIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
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
  DropdownMenuShortcut,
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
import { GlobalIcon } from "ui/global-icon";
import { AppDefaultToolkit } from "lib/ai/tools";
import { ChatMention } from "app-types/chat";
import { CountAnimation } from "ui/count-animation";

import { getShortcutKeyList, Shortcuts } from "lib/keyboard-shortcuts";
import { Separator } from "ui/separator";

interface ToolSelectDropdownProps {
  align?: "start" | "end" | "center";
  side?: "left" | "right" | "top" | "bottom";
  disabled?: boolean;
  mentions?: ChatMention[];
  onSelectWorkflow?: (workflow: WorkflowSummary) => void;
}

const calculateToolCount = (
  allowedMcpServers: Record<string, AllowedMCPServer>,
  mcpList: (MCPServerInfo & { id: string })[],
) => {
  return mcpList.reduce((acc, server) => {
    const count =
      allowedMcpServers[server.id]?.tools?.length ?? server.toolInfo.length;
    return acc + count;
  }, 0);
};

export function ToolSelectDropdown({
  align,
  side,
  onSelectWorkflow,
  mentions,
}: ToolSelectDropdownProps) {
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
  const { isLoading } = useMcpList({
    refreshInterval: 1000 * 60 * 5,
  });

  useWorkflowToolList({
    refreshInterval: 1000 * 60 * 5,
  });

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={"sm"}
          className={cn(
            "gap-0.5 bg-input/60 border rounded-full data-[state=open]:bg-input! hover:bg-input!",
            !bindingTools.length &&
              !isLoading &&
              "text-muted-foreground bg-transparent border-transparent",
            isLoading && "bg-input/60",
          )}
        >
          <span
            className={
              (mentions?.length ?? 0 > 0) ? "text-muted-foreground" : ""
            }
          >
            {(mentions?.length ?? 0 > 0) ? "Mention" : "Tools"}
          </span>
          {(bindingTools.length > 0 || isLoading) && (
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
      </DropdownMenuTrigger>
      <DropdownMenuContent className="md:w-72" align={align} side={side}>
        <DropdownMenuLabel className="flex items-center gap-2">
          <WrenchIcon className="size-3.5" />
          {t("toolsSetup")}
        </DropdownMenuLabel>

        <p className="text-xs text-muted-foreground w-full pl-8 pr-4 mb-2 whitespace-pre-wrap">
          {t("toolsSetupDescription")}
        </p>
        <div className="py-1 ">
          <DropdownMenuSeparator />
        </div>
        <ToolModeSelector />
        <div className="py-1 ">
          <DropdownMenuSeparator />
        </div>
        <WorkflowToolSelector onSelectWorkflow={onSelectWorkflow} />
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
            <DropdownMenuLabel className="flex items-center text-muted-foreground gap-2">
              {t("Chat.Tool.toolPresets")}
              <div className="flex-1" />
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant={"secondary"} size={"sm"} className="border">
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
                    placeholder="Preset Name"
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
  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-xs flex items-center gap-2 font-semibold cursor-pointer">
          <Waypoints className="size-3.5" />
          {t("Workflow.title")}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-80 relative">
            {workflowToolList.length === 0 ? (
              <div className="text-sm text-muted-foreground flex flex-col py-6 px-6 gap-4 items-center">
                <InfoIcon className="size-4" />
                <p className="whitespace-pre-wrap">{t("Workflow.noTools")}</p>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant={"ghost"} className="relative group">
                      What is Workflow?
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
              workflowToolList.map((workflow) => (
                <DropdownMenuItem
                  key={workflow.id}
                  className="cursor-pointer"
                  onClick={() => onSelectWorkflow?.(workflow)}
                >
                  {workflow.icon && workflow.icon.type === "emoji" ? (
                    <div
                      style={{
                        backgroundColor: workflow.icon?.style?.backgroundColor,
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
                  <div className="flex items-center gap-2 ml-auto text-xs">
                    <span className="text-muted-foreground">by</span>
                    <span className="">{workflow.userName}</span>
                    <Avatar className="size-3 ring rounded-full">
                      <AvatarImage src={workflow.userAvatar} />
                      <AvatarFallback>
                        {workflow.userName.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
      {/* ))
  )} */}
    </DropdownMenuGroup>
  );
}

function ToolModeSelector() {
  const t = useTranslations("Chat.Tool");
  const [toolChoice, appStoreMutate] = appStore(
    useShallow((state) => [state.toolChoice, state.mutate]),
  );

  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="text-xs flex items-center gap-2 font-semibold cursor-pointer">
          <Settings2Icon className="size-3.5" />
          {t("selectToolMode")}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-80 relative">
            <DropdownMenuLabel className="text-muted-foreground flex items-center gap-2">
              {t("selectToolMode")}
              <DropdownMenuShortcut>
                <span className="text-xs text-muted-foreground bg-muted rounded-md px-2 py-0.5">
                  {getShortcutKeyList(Shortcuts.toolMode).join("")}
                </span>
              </DropdownMenuShortcut>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  appStoreMutate({ toolChoice: "auto" });
                }}
              >
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <Infinity />
                    <span className="font-bold">Auto</span>
                    {toolChoice == "auto" && <Check className="ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("autoToolModeDescription")}
                  </p>
                </div>
              </DropdownMenuItem>
              <div className="px-2 py-1">
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  appStoreMutate({ toolChoice: "manual" });
                }}
              >
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck />
                    <span className="font-bold">Manual</span>
                    {toolChoice == "manual" && <Check className="ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("manualToolModeDescription")}
                  </p>
                </div>
              </DropdownMenuItem>
              <div className="px-2 py-1">
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  appStoreMutate({ toolChoice: "none" });
                }}
              >
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <PenOffIcon />
                    <span className="font-bold">None</span>
                    {toolChoice == "none" && <Check className="ml-auto" />}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("noneToolModeDescription")}
                  </p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}

function McpServerSelector() {
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
          allowedMcpServers?.[server.id]?.tools ??
          server.toolInfo.map((tool) => tool.name);
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
          <div>No MCP servers detected.</div>
          <Link href="/mcp">
            <Button
              variant={"ghost"}
              className="mt-2 text-primary flex items-center gap-1"
            >
              Add a server <ChevronRight className="size-4" />
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
                  {server.tools.filter((t) => t.checked).length > 0 ? (
                    <span className="w-5 h-5 items-center justify-center flex text-[8px] text-blue-500 font-normal rounded-full border border-border/40 bg-blue-500/5">
                      {server.tools.filter((t) => t.checked).length}
                    </span>
                  ) : null}

                  <ChevronRight className="size-4 text-muted-foreground" />
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
                  error
                </span>
              ) : null}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-80 relative">
                <McpServerToolSelector
                  tools={server.tools}
                  checked={server.checked}
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
  onClickAllChecked: (checked: boolean) => void;
  checked: boolean;
  onToolClick: (toolName: string, checked: boolean) => void;
}
function McpServerToolSelector({
  tools,
  onClickAllChecked,
  checked,
  onToolClick,
}: McpServerToolSelectorProps) {
  const t = useTranslations("Common");
  const [search, setSearch] = useState("");
  const filteredTools = useMemo(() => {
    return tools.filter((tool) =>
      tool.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [tools, search]);
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
      let icon = <Wrench className="size-3.5 text-primary" />;
      switch (toolkit) {
        case AppDefaultToolkit.Visualization:
          icon = <ChartColumn className="size-3.5 text-blue-500 stroke-3" />;
          break;
        case AppDefaultToolkit.WebSearch:
          icon = <GlobalIcon className="text-blue-400 size-3.5" />;
          break;
        case AppDefaultToolkit.Http:
          icon = <HardDriveUploadIcon className="size-3.5 text-blue-400" />;
          break;
        case AppDefaultToolkit.Code:
          icon = <CodeIcon className="size-3.5 text-yellow-400" />;
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
            className="cursor-pointer font-semibold text-xs"
            onClick={(e) => {
              e.preventDefault();
              toggleAppDefaultToolkit(tool.id);
            }}
          >
            {tool.icon}
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
