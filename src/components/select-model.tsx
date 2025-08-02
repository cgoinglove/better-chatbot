"use client";

import { appStore } from "@/app/store";
import { useChatModels } from "@/hooks/queries/use-chat-models";
import { ChatModel } from "app-types/chat";
import { CheckIcon, ChevronDown } from "lucide-react";
import { Fragment, memo, PropsWithChildren, useEffect, useState } from "react";
import { Button } from "ui/button";
import { ClaudeIcon } from "ui/claude-icon";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "ui/command";
import { GeminiIcon } from "ui/gemini-icon";
import { GrokIcon } from "ui/grok-icon";
import { OpenAIIcon } from "ui/openai-icon";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";

interface SelectModelProps {
  onSelect: (model: ChatModel) => void;
  align?: "start" | "end";
  defaultModel?: ChatModel;
  showProvider?: boolean;
}

export const SelectModel = (props: PropsWithChildren<SelectModelProps>) => {
  const [open, setOpen] = useState(false);
  const { data: providers } = useChatModels();
  const [model, setModel] = useState(props.defaultModel);

  useEffect(() => {
    setModel(props.defaultModel ?? appStore.getState().chatModel);
  }, [props.defaultModel]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {props.children || (
          <Button
            variant={"secondary"}
            size={"sm"}
            className="data-[state=open]:bg-input! hover:bg-input! "
          >
            <div className="mr-auto flex items-center gap-1">
              {(props.showProvider ?? true) && (
                <ProviderIcon
                  provider={model?.provider || ""}
                  className="size-2.5 mr-1"
                />
              )}
              <p>{model?.model || "model"}</p>
            </div>
            <ChevronDown className="size-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[280px]" align={props.align || "end"}>
        <Command
          className="rounded-lg relative shadow-md h-80"
          value={JSON.stringify(model)}
          onClick={(e) => e.stopPropagation()}
        >
          <CommandInput placeholder="search model..." />
          <CommandList className="p-2">
            <CommandEmpty>No results found.</CommandEmpty>
            {providers?.map((provider, i) => (
              <Fragment key={provider.provider}>
                <CommandGroup
                  heading={<ProviderHeader provider={provider.provider} />}
                  className="pb-4 group"
                  onWheel={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {provider.models.map((item) => (
                    <CommandItem
                      key={item.name}
                      className="cursor-pointer"
                      onSelect={() => {
                        setModel({
                          provider: provider.provider,
                          model: item.name,
                        });
                        props.onSelect({
                          provider: provider.provider,
                          model: item.name,
                        });
                        setOpen(false);
                      }}
                      value={item.name}
                    >
                      {model?.provider === provider.provider &&
                      model?.model === item.name ? (
                        <CheckIcon className="size-3" />
                      ) : (
                        <div className="ml-3" />
                      )}
                      <span className="pr-2">{item.name}</span>
                      {item.isToolCallUnsupported && (
                        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                          No tools
                        </div>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {i < providers?.length - 1 && <CommandSeparator />}
              </Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

function ProviderIcon({
  provider,
  className,
}: { provider: string; className?: string }) {
  return provider === "openai" ? (
    <OpenAIIcon className={className} />
  ) : provider === "xai" ? (
    <GrokIcon className={className} />
  ) : provider === "anthropic" ? (
    <ClaudeIcon className={className} />
  ) : provider === "google" ? (
    <GeminiIcon className={className} />
  ) : null;
}

const ProviderHeader = memo(function ProviderHeader({
  provider,
}: { provider: string }) {
  return (
    <div className="text-sm text-muted-foreground flex items-center gap-1.5 group-hover:text-foreground transition-colors duration-300">
      {provider === "openai" ? (
        <ProviderIcon provider="openai" className="size-3 text-foreground" />
      ) : (
        <ProviderIcon provider={provider} className="size-3" />
      )}
      {provider}
    </div>
  );
});
