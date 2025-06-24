"use client";

import { appStore } from "@/app/store";
import { useChatModels } from "@/hooks/queries/use-chat-models";
import { ChatModel } from "app-types/chat";
import { ChevronDown } from "lucide-react";
import { Fragment, PropsWithChildren, useEffect, useState } from "react";
import { Button } from "ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";

interface SelectModelProps {
  onSelect: (model: ChatModel) => void;
  align?: "start" | "end";
  defaultModel?: ChatModel;
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
            <p className="mr-auto">
              {model?.model ?? (
                <span className="text-muted-foreground">model</span>
              )}
            </p>
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
                  heading={provider.provider}
                  className="pb-4"
                  onWheel={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {provider.models.map((model) => (
                    <CommandItem
                      key={model.name}
                      className="cursor-pointer"
                      onSelect={() => {
                        setModel({
                          provider: provider.provider,
                          model: model.name,
                        });
                        props.onSelect({
                          provider: provider.provider,
                          model: model.name,
                        });
                        setOpen(false);
                      }}
                      value={model.name}
                    >
                      <span className="px-2">{model.name}</span>
                      {model.isToolCallUnsupported && (
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
