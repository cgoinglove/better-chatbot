"use client";

import { ChatMentionInputSuggestion } from "@/components/chat-mention-input";
import { DefaultToolIcon } from "@/components/default-tool-icon";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import { useWorkflowToolList } from "@/hooks/queries/use-workflow-tool-list";
import { useObjectState } from "@/hooks/use-object-state";
import { Agent, AgentGenerateSchema, AgentUpsertSchema } from "app-types/agent";
import { ChatMention, ChatModel } from "app-types/chat";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { DefaultToolName } from "lib/ai/tools";
import { BACKGROUND_COLORS } from "lib/const";
import equal from "lib/equal";
import { cn, createDebounce, fetcher, noop, objectFlow } from "lib/utils";
import {
  ChevronDownIcon,
  CommandIcon,
  CornerRightUpIcon,
  HammerIcon,
  Loader,
  WandSparklesIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Button } from "ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { MCPIcon } from "ui/mcp-icon";

import { ScrollArea } from "ui/scroll-area";
import { Textarea } from "ui/textarea";
import {
  RandomDataGeneratorExample,
  WeatherExample,
} from "lib/ai/agent/example";
import useSWR, { mutate } from "swr";
import { Skeleton } from "ui/skeleton";
import { safe } from "ts-safe";
import { handleErrorWithToast } from "ui/shared-toast";
import { appStore } from "@/app/store";

import { experimental_useObject } from "@ai-sdk/react";
import { MCPServerInfo } from "app-types/mcp";
import { WorkflowSummary } from "app-types/workflow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { SelectModel } from "@/components/select-model";

import { MessageLoading } from "ui/message-loading";
import { TextShimmer } from "ui/text-shimmer";
import { toast } from "sonner";

const colorUpdateDebounce = createDebounce();

const defaultConfig = (): PartialBy<
  Omit<Agent, "createdAt" | "updatedAt" | "userId">,
  "id"
> => {
  return {
    name: "",
    description: "",
    icon: {
      type: "emoji",
      value:
        "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f916.png",
      style: {
        backgroundColor: BACKGROUND_COLORS[0],
      },
    },
    instructions: {
      role: "",
      systemPrompt: "",
      mentions: [],
    },
  };
};

export default function EditAgent({ id }: { id?: string }) {
  const t = useTranslations();
  const { theme } = useTheme();
  const [openGenerateAgentDialog, setOpenGenerateAgentDialog] = useState(false);
  const [generateModel, setGenerateModel] = useState<ChatModel | undefined>(
    appStore.getState().chatModel,
  );
  const [generateAgentPrompt, setGenerateAgentPrompt] = useState("");
  const { data: mcpList, isLoading: isMcpLoading } = useMcpList();
  const { data: workflowToolList, isLoading: isWorkflowLoading } =
    useWorkflowToolList();
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const {
    object,
    submit,
    isLoading: isGenerating,
  } = experimental_useObject({
    api: "/api/agent/ai",
    schema: AgentGenerateSchema,
    onFinish(event) {
      if (event.error) {
        handleErrorWithToast(event.error);
      }
      if (event.object?.tools) {
        assignToolsByNames(event.object.tools);
      }
    },
  });

  const [open, setOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [agent, setAgent] = useObjectState(defaultConfig());

  const assignToolsByNames = useCallback(
    (toolNames: string[]) => {
      const allMentions: ChatMention[] = [];
      objectFlow(DefaultToolName).forEach((toolName) => {
        if (toolNames.includes(toolName)) {
          allMentions.push({
            type: "defaultTool",
            name: toolName,
            label: toolName,
          });
        }
      });

      (mcpList as (MCPServerInfo & { id: string })[]).forEach((mcp) => {
        mcp.toolInfo.forEach((tool) => {
          if (toolNames.includes(tool.name)) {
            allMentions.push({
              type: "mcpTool",
              serverName: mcp.name,
              name: tool.name,
              serverId: mcp.id,
            });
          }
        });
      });

      (workflowToolList as WorkflowSummary[]).forEach((workflow) => {
        if (toolNames.includes(workflow.name)) {
          allMentions.push({
            type: "workflow",
            name: workflow.name,
            workflowId: workflow.id,
          });
        }
      });
      if (allMentions.length > 0) {
        setAgent((prev) => {
          return {
            instructions: {
              ...prev.instructions,
              mentions: allMentions,
            },
          };
        });
      }
    },
    [mcpList, workflowToolList],
  );
  const {
    isLoading: isStoredAgentLoading,
    mutate: mutateStoredAgent,
    isValidating,
  } = useSWR(id ? `/api/agent/${id}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateIfHidden: false,
    onError: (error) => {
      handleErrorWithToast(error);
      router.push(`/`);
    },
    onSuccess: (data) => {
      if (data) {
        setAgent({ ...defaultConfig(), ...data });
      } else {
        toast.error(`Agent not found`);
        router.push(`/`);
      }
    },
  });

  const saveAgent = useCallback(() => {
    setIsSaving(true);
    safe(() => AgentUpsertSchema.parse(agent))
      .map(JSON.stringify)
      .map(async (body) =>
        fetcher(`/api/agent`, {
          method: "POST",
          body,
        }),
      )
      .ifOk(() => {
        mutate(`/api/agent`);
        router.push(`/`);
      })
      .ifFail(handleErrorWithToast)
      .watch(() => setIsSaving(false));
  }, [agent]);

  const handleOpenAiGenerate = useCallback(async () => {
    setOpenGenerateAgentDialog(true);
    setGenerateAgentPrompt("");
  }, []);

  const triggerRef = useRef<HTMLDivElement>(null);
  const triggerRect = useMemo(() => {
    return triggerRef.current?.getBoundingClientRect();
  }, [open]);

  const handleSelectMention = useCallback(
    (item: { label: string; id: string }) => {
      const mention = JSON.parse(item.id) as ChatMention;
      setAgent((prev) => {
        const mentions = [...(prev.instructions?.mentions ?? [])];
        const index = mentions.findIndex((m) => equal(m, mention));
        if (index !== -1) {
          mentions.splice(index, 1);
        } else {
          mentions.push(mention);
        }
        return {
          instructions: {
            ...prev.instructions,
            mentions,
          },
        };
      });
    },
    [],
  );

  const selectedIds = useMemo(() => {
    return (agent.instructions?.mentions ?? []).map((m) => JSON.stringify(m));
  }, [agent.instructions?.mentions]);

  const handleDeleteMention = useCallback((mention: ChatMention) => {
    setAgent((prev) => {
      return {
        instructions: {
          ...prev.instructions,
          mentions: prev.instructions?.mentions?.filter(
            (m) => !equal(m, mention),
          ),
        },
      };
    });
  }, []);

  const selectedMentions = useMemo(() => {
    return (agent.instructions?.mentions ?? []).map((m, i) => {
      return (
        <div
          key={i}
          className="hover:ring hover:ring-destructive group cursor-pointer text-xs flex items-center gap-1 px-2 py-1 rounded-sm bg-background"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteMention(m);
          }}
        >
          <div className="p-0.5">
            {m.type == "defaultTool" ? (
              <DefaultToolIcon
                name={m.name as DefaultToolName}
                className="size-3"
              />
            ) : m.type == "mcpServer" ? (
              <MCPIcon className="size-3" />
            ) : m.type == "workflow" ? (
              <Avatar
                style={m.icon?.style}
                className="size-3 ring-[1px] ring-input rounded-full"
              >
                <AvatarImage src={m.icon?.value} />
                <AvatarFallback>{m.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
            ) : (
              <HammerIcon className="size-3" />
            )}
          </div>

          {m.name}

          <span className="ml-2">
            <XIcon className="size-2.5 text-muted-foreground group-hover:text-destructive" />
          </span>
        </div>
      );
    });
  }, [agent.instructions?.mentions]);

  const submitGenerateAgent = useCallback(() => {
    submit({
      message: generateAgentPrompt,
      chatModel: generateModel,
    });
    setOpenGenerateAgentDialog(false);
    setGenerateAgentPrompt("");
    setGenerateModel(undefined);
  }, [generateAgentPrompt, generateModel]);

  const isLoadingTool = useMemo(() => {
    return isMcpLoading || isWorkflowLoading;
  }, [isMcpLoading, isWorkflowLoading]);

  const isLoading = useMemo(() => {
    return isGenerating || isLoadingTool || isSaving || isValidating;
  }, [isGenerating, isLoadingTool, isSaving, isValidating]);

  useEffect(() => {
    if (!object) return;
    objectFlow(object).forEach((data, key) => {
      setAgent((prev) => {
        if (key == "name") {
          return {
            name: data as string,
          };
        }
        if (key == "description") {
          return {
            description: data as string,
          };
        }
        if (key == "instructions") {
          textareaRef.current?.scrollTo({
            top: textareaRef.current?.scrollHeight,
          });
          return {
            instructions: {
              ...prev.instructions,
              systemPrompt: data as string,
            },
          };
        }
        if (key == "role") {
          return {
            instructions: {
              ...prev.instructions,
              role: data as string,
            },
          };
        }
        return prev;
      });
    });
  }, [object]);
  useEffect(() => {
    if (id && !isValidating) {
      mutateStoredAgent();
    } else if (!id) {
      setAgent(defaultConfig());
    }
  }, [id]);

  return (
    <ScrollArea className="h-full w-full relative">
      <div className="w-full h-8 absolute bottom-0 left-0 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />
      <div className="z-10 relative flex flex-col gap-4 px-8 pt-8 pb-14  max-w-3xl h-full mx-auto">
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between pb-4 gap-2">
          <div className="w-full h-8 absolute top-[100%] left-0 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
          {isGenerating ? (
            <TextShimmer className="w-full text-2xl font-bold ">
              {t("Agent.generatingAgent")}
            </TextShimmer>
          ) : (
            <p className="w-full text-2xl font-bold ">{t("Agent.title")}</p>
          )}

          <Button
            variant={"ghost"}
            className="ml-auto"
            disabled={isLoading}
            onClick={handleOpenAiGenerate}
          >
            <WandSparklesIcon className="size-3" />
            {t("Common.generateWithAI")}
            {isGenerating && <Loader className="size-3 animate-spin" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="justify-between data-[state=open]:bg-input"
                disabled={isLoading}
              >
                {t("Common.createWithExample")}
                <ChevronDownIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-54" align="end">
              <DropdownMenuItem
                onClick={() => setAgent(RandomDataGeneratorExample)}
              >
                <div className="flex items-center gap-2">
                  <span>🎲</span>
                  <span>Generate Random Data</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAgent(WeatherExample)}>
                <div className="flex items-center gap-2">
                  <span>🌤️</span>
                  <span>Weather Checker</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-4 mt-4">
          <div className="flex flex-col justify-between gap-2 flex-1">
            <Label htmlFor="agent-name">
              {t("Agent.agentNameAndIconLabel")}
            </Label>
            {isStoredAgentLoading ? (
              <Skeleton className="w-full h-10" />
            ) : (
              <Input
                value={agent.name || ""}
                onChange={(e) => setAgent({ name: e.target.value })}
                autoFocus
                disabled={isLoading}
                className="hover:bg-input bg-secondary/40 transition-colors border-transparent border-none! focus-visible:bg-input! ring-0!"
                id="agent-name"
                placeholder={t("Agent.agentNamePlaceholder")}
              />
            )}
          </div>
          {isStoredAgentLoading ? (
            <Skeleton className="w-16 h-16" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  style={{
                    backgroundColor: agent.icon?.style?.backgroundColor,
                  }}
                  className="transition-colors hover:bg-secondary! group items-center justify-center flex w-16 h-16 rounded-lg cursor-pointer ring ring-background hover:ring-ring"
                >
                  <Avatar className="size-10">
                    <AvatarImage
                      src={agent.icon?.value}
                      className="group-hover:scale-110  transition-transform"
                    />
                    <AvatarFallback></AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-0 bg-transparent flex flex-col gap-2 border-none">
                <div className="flex gap-2 border rounded-xl p-4  bg-secondary">
                  {BACKGROUND_COLORS.map((color, index) => (
                    <div
                      key={index}
                      className="w-6 h-6 rounded cursor-pointer"
                      onClick={() => {
                        setAgent({
                          icon: {
                            ...agent.icon!,
                            style: { backgroundColor: color },
                          },
                        });
                      }}
                      style={{ backgroundColor: color }}
                    ></div>
                  ))}
                  <div className="relative">
                    <input
                      type="color"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        colorUpdateDebounce(() => {
                          setAgent({
                            icon: {
                              ...agent.icon!,
                              style: { backgroundColor: e.target.value },
                            },
                          });
                        }, 100);
                      }}
                    />
                    <div className="w-6 h-6 rounded cursor-pointer  border-muted-foreground/50 flex items-center justify-center hover:border-muted-foreground transition-colors">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: agent.icon?.style?.backgroundColor,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <EmojiPicker
                  lazyLoadEmojis
                  open
                  className="fade-300"
                  theme={theme == "dark" ? Theme.DARK : Theme.LIGHT}
                  onEmojiClick={(emoji) => {
                    setAgent({
                      icon: {
                        ...agent.icon!,
                        value: emoji.imageUrl,
                        type: "emoji",
                      },
                    });
                  }}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="agent-description">
            {t("Agent.agentDescriptionLabel")}
          </Label>
          {isStoredAgentLoading ? (
            <Skeleton className="w-full h-10" />
          ) : (
            <Input
              id="agent-description"
              disabled={isLoading}
              placeholder={t("Agent.agentDescriptionPlaceholder")}
              className="hover:bg-input placeholder:text-xs bg-secondary/40 transition-colors border-transparent border-none! focus-visible:bg-input! ring-0!"
              value={agent.description || ""}
              onChange={(e) => setAgent({ description: e.target.value })}
            />
          )}
        </div>
        <div className="mt-10 flex items-center gap-2">
          <p className="text-sm text-muted-foreground ">
            {t("Agent.agentSettingsDescription")}
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex gap-2 items-center">
            <span>{t("Agent.thisAgentIs")}</span>
            {isStoredAgentLoading ? (
              <Skeleton className="w-44 h-10" />
            ) : (
              <Input
                id="agent-role"
                disabled={isLoading}
                placeholder={t("Agent.agentRolePlaceholder")}
                className="hover:bg-input placeholder:text-xs bg-secondary/40 w-44 transition-colors border-transparent border-none! focus-visible:bg-input! ring-0!"
                value={agent.instructions?.role || ""}
                onChange={(e) =>
                  setAgent({
                    instructions: {
                      ...agent.instructions,
                      role: e.target.value || "",
                    },
                  })
                }
              />
            )}
            <span>{t("Agent.expertIn")}</span>
          </div>
          <div className="flex gap-2 flex-col">
            <Label htmlFor="agent-prompt" className="text-base">
              {t("Agent.agentInstructionsLabel")}
            </Label>
            {isStoredAgentLoading ? (
              <Skeleton className="w-full h-48" />
            ) : (
              <Textarea
                id="agent-prompt"
                ref={textareaRef}
                disabled={isLoading}
                placeholder={t("Agent.agentInstructionsPlaceholder")}
                className="p-6 hover:bg-input min-h-48 max-h-96 overflow-y-auto resize-none placeholder:text-xs bg-secondary/40 transition-colors border-transparent border-none! focus-visible:bg-input! ring-0!"
                value={agent.instructions?.systemPrompt || ""}
                onChange={(e) =>
                  setAgent({
                    instructions: {
                      ...agent.instructions,
                      systemPrompt: e.target.value || "",
                    },
                  })
                }
              />
            )}
          </div>

          <div className="flex gap-2 flex-col">
            <Label htmlFor="agent-tool-bindings" className="text-base">
              {t("Agent.agentToolsLabel")}
            </Label>
            {isStoredAgentLoading ? (
              <Skeleton className="w-full h-12" />
            ) : (
              <ChatMentionInputSuggestion
                onSelectMention={handleSelectMention}
                onClose={noop}
                open={open}
                disabledType={["agent"]}
                onOpenChange={setOpen}
                top={0}
                left={0}
                selectedIds={selectedIds}
                style={{
                  width: triggerRect?.width ?? 0,
                }}
              >
                <div
                  className="hover:bg-input w-full justify-start flex items-center gap-2 cursor-pointer px-3 py-4 rounded-md bg-secondary"
                  ref={triggerRef}
                >
                  <div className="flex gap-2 items-center flex-wrap mr-auto">
                    {isLoadingTool ? (
                      <span className="text-sm text-muted-foreground">
                        {t("Agent.loadingTools")}
                      </span>
                    ) : selectedMentions.length == 0 ? (
                      <span className="text-sm text-muted-foreground">
                        {t("Agent.addTools")}
                      </span>
                    ) : (
                      selectedMentions
                    )}
                  </div>
                  {isLoadingTool ? (
                    <Loader className="size-4 animate-spin" />
                  ) : (
                    <ChevronDownIcon
                      className={cn(
                        "size-4 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  )}
                </div>
              </ChatMentionInputSuggestion>
            )}
          </div>
        </div>
        <div
          className={cn("flex justify-end", isStoredAgentLoading && "hidden")}
        >
          <Button className="mt-2" onClick={saveAgent} disabled={isLoading}>
            {isSaving ? t("Common.saving") : t("Common.save")}
            {isSaving && <Loader className="size-4 animate-spin" />}
          </Button>
        </div>
      </div>
      <Dialog
        open={openGenerateAgentDialog}
        onOpenChange={setOpenGenerateAgentDialog}
      >
        <DialogContent className="xl:max-w-[40vw] w-full max-w-full">
          <DialogHeader>
            <DialogTitle>Generate Agent</DialogTitle>
            <DialogDescription className="sr-only">
              Generate Agent
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 w-full">
            <div className="px-4">
              <p className="bg-secondary rounded-lg max-w-2/3 p-4">
                {t("Agent.generateAgentDetailedGreeting")}
              </p>
            </div>

            <div className="flex justify-end px-4">
              <p
                className={cn(
                  "text-sm bg-primary text-primary-foreground py-4 px-6 rounded-lg",
                )}
              >
                <MessageLoading className="size-4" />
              </p>
            </div>

            <div className="relative flex flex-col border rounded-lg p-4">
              <Textarea
                value={generateAgentPrompt}
                autoFocus
                placeholder="input prompt here..."
                onChange={(e) => setGenerateAgentPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) {
                    e.preventDefault();
                    submitGenerateAgent();
                  }
                }}
                className="w-full break-all pb-6 border-none! ring-0! resize-none min-h-24 max-h-48 overflow-y-auto placeholder:text-xs transition-colors"
              />
              <div className="flex justify-end items-center gap-2">
                <SelectModel
                  showProvider
                  onSelect={(model) => setGenerateModel(model)}
                />
                <Button
                  disabled={!generateAgentPrompt.trim()}
                  size={"sm"}
                  onClick={() => {
                    submitGenerateAgent();
                  }}
                  className="text-xs"
                >
                  <span className="mr-1">Send</span>
                  <CommandIcon className="size-3" />
                  <CornerRightUpIcon className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
