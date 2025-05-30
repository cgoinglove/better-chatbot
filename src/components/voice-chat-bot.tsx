"use client";

import { UIMessage } from "ai";
import {
  DEFAULT_VOICE_TOOLS,
  UIMessageWithCompleted,
  VoiceChatHook,
} from "lib/ai/speech";

import {
  OPENAI_VOICE,
  useOpenAIVoiceChat,
} from "lib/ai/speech/open-ai/use-voice-chat.openai";
import { cn, nextTick } from "lib/utils";
import {
  CheckIcon,
  Loader,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  Settings2Icon,
  TriangleAlertIcon,
  XIcon,
  MessagesSquareIcon,
  MessageSquareMoreIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { safe } from "ts-safe";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Button } from "ui/button";

import {
  Drawer,
  DrawerContent,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
} from "ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { GeminiIcon } from "ui/gemini-icon";
import { MessageLoading } from "ui/message-loading";
import { OpenAIIcon } from "ui/openai-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { ToolMessagePart } from "./message-parts";
import { FlipWords } from "ui/flip-words";

import { EnabledMcpTools } from "./enabled-mcp-tools";
import { ToolInvocationUIPart } from "app-types/chat";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { mutate } from "swr";

const isNotEmptyUIMessage = (message: UIMessage) => {
  return message.parts.some((v) => {
    if (v.type === "text") {
      return v.text.trim() !== "";
    }
    return true;
  });
};

function mergeConsecutiveMessages(messages: UIMessage[]): UIMessage[] {
  if (messages.length === 0) return [];

  const merged: UIMessage[] = [];
  let current = { ...messages[0], parts: [...messages[0].parts] };

  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === current.role) {
      current.parts = [...current.parts, ...msg.parts];
    } else {
      merged.push(current);
      current = { ...msg, parts: [...msg.parts] };
    }
  }
  merged.push(current);

  return merged;
}

const prependTools = [
  {
    serverName: "Browser",
    tools: DEFAULT_VOICE_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
    })),
  },
];

export function VoiceChatBot() {
  const [appStoreMutate, voiceChat, model, currentThreadId, currentProjectId] =
    appStore(
      useShallow((state) => [
        state.mutate,
        state.voiceChat,
        state.model,
        state.currentThreadId,
        state.currentProjectId,
      ]),
    );

  const [isClosing, setIsClosing] = useState(false);
  const startAudio = useRef<HTMLAudioElement>(null);
  const [useCompactView, setUseCompactView] = useState(false);

  const Hook = useMemo<VoiceChatHook>(() => {
    switch (voiceChat.options.provider) {
      case "openai":
        return useOpenAIVoiceChat;
      default:
        return useOpenAIVoiceChat;
    }
  }, [voiceChat.options.provider]);

  const {
    isListening,
    isLoading,
    isActive,
    messages,
    error,
    start,
    startListening,
    stop,
    stopListening,
  } = Hook(voiceChat.options.providerOptions);

  const startWithSound = useCallback(() => {
    if (!startAudio.current) {
      startAudio.current = new Audio("/sounds/start_voice.ogg");
    }
    start().then(() => {
      startAudio.current?.play().catch(() => {});
    });
  }, [start]);

  const endVoiceChat = useCallback(async () => {
    setIsClosing(true);
    await safe(() => stop());
    await safe(() => {
      if (!currentThreadId) return;
      const saveMessages = messages.filter(
        (v) => v.completed && isNotEmptyUIMessage(v),
      );
      return fetch(`/api/chat/${currentThreadId}`, {
        method: "POST",
        body: JSON.stringify({
          messages: mergeConsecutiveMessages(saveMessages),
          model,
          projectId: currentProjectId,
        }),
      });
    }).ifOk(() => {
      if (messages.length && currentThreadId) {
        nextTick().then(() => {
          mutate("threads");
          window.location.href = `/chat/${currentThreadId}`;
        });
      }
    });
    setIsClosing(false);
    appStoreMutate({
      voiceChat: {
        ...voiceChat,
        isOpen: false,
      },
    });
  }, [messages, currentProjectId, model, currentThreadId]);

  useEffect(() => {
    return () => {
      if (isActive) {
        stop();
      }
    };
  }, [voiceChat.options.provider]);

  useEffect(() => {
    if (voiceChat.isOpen) {
      startWithSound();
    } else if (isActive) {
      stop();
    }
  }, [voiceChat.isOpen]);

  useEffect(() => {
    if (error && isActive) {
      toast.error(error.message);
      stop();
    }
  }, [error]);

  return (
    <Drawer dismissible={false} open={voiceChat.isOpen} direction="top">
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerContent className="max-h-[100vh]! h-full border-none! rounded-none! flex flex-col">
          <div className="w-full h-full flex flex-col bg-background">
            <div
              className="w-full flex p-6 gap-2"
              style={{
                userSelect: "text",
              }}
            >
              <div className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={"secondary"}
                      size={"icon"}
                      onClick={() => setUseCompactView(!useCompactView)}
                    >
                      {useCompactView ? (
                        <MessageSquareMoreIcon />
                      ) : (
                        <MessagesSquareIcon />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {useCompactView
                      ? "Compact display mode"
                      : "Conversation display mode"}
                  </TooltipContent>
                </Tooltip>
              </div>
              <DrawerTitle className="flex items-center gap-2 w-full">
                <EnabledMcpTools
                  align="start"
                  side="bottom"
                  prependTools={prependTools}
                />

                <div className="flex-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={"ghost"} size={"icon"}>
                      <Settings2Icon className="text-foreground size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="left"
                    className="min-w-40"
                    align="start"
                  >
                    <DropdownMenuGroup className="cursor-pointer">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                          <OpenAIIcon className="size-3.5 stroke-none fill-foreground" />
                          Open AI
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {Object.entries(OPENAI_VOICE).map(
                              ([key, value]) => (
                                <DropdownMenuItem
                                  className="cursor-pointer flex items-center justify-between"
                                  onClick={() =>
                                    appStoreMutate({
                                      voiceChat: {
                                        ...voiceChat,
                                        options: {
                                          provider: "openai",
                                          providerOptions: {
                                            model: value,
                                          },
                                        },
                                      },
                                    })
                                  }
                                  key={key}
                                >
                                  {key}

                                  {value ===
                                    voiceChat.options.providerOptions
                                      ?.model && (
                                    <CheckIcon className="size-3.5" />
                                  )}
                                </DropdownMenuItem>
                              ),
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="flex items-center gap-2 text-muted-foreground">
                            <GeminiIcon className="size-3.5" />
                            Gemini
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <div className="text-xs text-muted-foreground p-6">
                                Not Implemented Yet
                              </div>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      </DropdownMenuSub>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DrawerTitle>
            </div>
            <div className="flex-1 min-h-0 mx-auto w-full">
              {error ? (
                <div className="max-w-3xl mx-auto">
                  <Alert variant={"destructive"}>
                    <TriangleAlertIcon className="size-4 " />
                    <AlertTitle className="">Error</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>

                    <AlertDescription className="my-4 ">
                      <p className="text-muted-foreground ">
                        Please close the voice chat and try again.
                      </p>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : null}
              {isLoading ? (
                <div className="flex-1"></div>
              ) : (
                <div className="h-full w-full">
                  {useCompactView ? (
                    <CompactMessageView messages={messages} />
                  ) : (
                    <ConversationView messages={messages} />
                  )}
                </div>
              )}
            </div>
            <div className="w-full p-6 flex items-center justify-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={"secondary"}
                    size={"icon"}
                    disabled={isClosing || isLoading}
                    onClick={() => {
                      if (!isActive) {
                        startWithSound();
                      } else if (isListening) {
                        stopListening();
                      } else {
                        startListening();
                      }
                    }}
                    className={cn(
                      "rounded-full p-6",

                      isLoading
                        ? "bg-accent-foreground text-accent animate-pulse"
                        : !isActive
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/30"
                          : !isListening
                            ? "bg-destructive/30 text-destructive hover:bg-destructive/10"
                            : "",
                    )}
                  >
                    {isLoading || isClosing ? (
                      <Loader className="size-6 animate-spin" />
                    ) : !isActive ? (
                      <PhoneIcon className="size-6 fill-green-500 stroke-none" />
                    ) : isListening ? (
                      <MicIcon className="size-6" />
                    ) : (
                      <MicOffIcon className="size-6" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!isActive
                    ? "Start Conversation"
                    : isListening
                      ? "Close Mic"
                      : "Open Mic"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={"secondary"}
                    size={"icon"}
                    className="rounded-full p-6"
                    disabled={isLoading || isClosing}
                    onClick={endVoiceChat}
                  >
                    <XIcon className="text-foreground size-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>End conversation</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}

function ConversationView({
  messages,
}: { messages: UIMessageWithCompleted[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);
  return (
    <div className="select-text w-full overflow-y-auto h-full" ref={ref}>
      <div className="max-w-4xl mx-auto flex flex-col px-6 gap-6 pb-44">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex px-4 py-3",
              message.role == "user" &&
                "ml-auto max-w-2xl text-foreground rounded-2xl w-fit bg-card",
              message.role == "assistant" &&
                !message.completed &&
                "bg-foreground rounded-2xl w-fit",
            )}
          >
            {!message.completed ? (
              <MessageLoading
                className={cn(
                  message.role == "user"
                    ? "text-muted-foreground"
                    : "text-background",
                )}
              />
            ) : (
              message.parts.map((part, index) => {
                if (part.type === "text") {
                  return !part.text ? (
                    <MessageLoading
                      className={
                        message.role == "user"
                          ? "text-muted-foreground"
                          : "text-accent-foreground"
                      }
                      key={index}
                    />
                  ) : message.role == "user" ? (
                    <p key={index} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  ) : (
                    <FlipWords words={[part.text]} key={index} />
                  );
                } else if (part.type === "tool-invocation") {
                  return (
                    <ToolMessagePart
                      key={index}
                      part={part}
                      message={message}
                      isLast={part.toolInvocation.state != "result"}
                    />
                  );
                }
                return <p key={index}>{part.type} unknown part</p>;
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactMessageView({
  messages,
}: { messages: UIMessageWithCompleted[] }) {
  const { toolMessage, assistantMessage } = useMemo(() => {
    return {
      toolMessage: messages.findLast((v) =>
        v.parts.some((v) => v.type === "tool-invocation"),
      ),
      assistantMessage: messages.findLast(
        (v) => v.role === "assistant" && v.parts.some((v) => v.type === "text"),
      ),
    };
  }, [messages]);

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-6 w-full h-full ">
      <div className="h-10 w-full relative z-50">
        <div className="absolute top-0 left-0 w-full h-full">
          {toolMessage && (
            <ToolMessagePart
              part={toolMessage.parts[0] as ToolInvocationUIPart}
              message={toolMessage}
              isLast={true}
            />
          )}
        </div>
      </div>
      {assistantMessage ? (
        <div className="flex flex-col gap-2 text-4xl font-semibold w-full min-h-0 overflow-y-auto select-text flex-1">
          {assistantMessage.parts.map((v, index) => {
            if (v.type === "text") {
              if (assistantMessage.completed) {
                return (
                  <div
                    key={index}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <FlipWords words={[v.text]} key={index} />
                  </div>
                );
              } else {
                return (
                  <div
                    key={index}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <MessageLoading className="text-muted-foreground size-20" />
                  </div>
                );
              }
            }
            return null;
          })}
        </div>
      ) : null}
    </div>
  );
}
