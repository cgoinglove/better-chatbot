"use client";
import { appStore } from "@/app/store";
import { AudioWaveformIcon, Loader, PencilLine, Trash } from "lucide-react";
import { type PropsWithChildren, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { safe } from "ts-safe";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "ui/command";

import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";
import { useTranslations } from "next-intl";
import { fetcher, generateUUID } from "lib/utils";
import { Agent } from "app-types/agent";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = PropsWithChildren<{
  agent: Omit<Agent, "createdAt" | "updatedAt" | "userId" | "instructions">;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "end" | "center";
}>;

export function AgentDropdown({ agent, children, side, align }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    safe()
      .watch(() => setIsDeleting(true))
      .ifOk(() => fetcher(`/api/agent/${agent.id}`, { method: "DELETE" }))
      .watch(() => setIsDeleting(false))
      .ifOk(() => mutate("/api/agent"))
      .watch(({ isOk, error }) => {
        if (isOk) {
          if (location.pathname.includes(agent.id)) {
            router.push("/");
          }
          toast.success(t("Common.success"));
        } else {
          toast.error(error.message || "Error");
        }
      })
      .unwrap();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="p-0 w-[220px]" side={side} align={align}>
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem className="cursor-pointer p-0">
                <div
                  className="flex items-center gap-2 w-full px-2 py-1 rounded"
                  onClick={() => {
                    appStore.setState((state) => ({
                      voiceChat: {
                        ...state.voiceChat,
                        isOpen: true,
                        threadId: generateUUID(),
                        agentId: agent.id,
                      },
                    }));
                  }}
                >
                  <AudioWaveformIcon className="text-foreground" />
                  <span>{t("Chat.VoiceChat.title")}</span>
                </div>
              </CommandItem>
              <CommandItem className="cursor-pointer p-0">
                <Link
                  href={`/agent/${agent.id}`}
                  className="flex items-center gap-2 w-full px-2 py-1 rounded"
                >
                  <PencilLine className="text-foreground" />
                  {t("Common.edit")}
                </Link>
              </CommandItem>
              <CommandSeparator className="my-1" />

              <CommandItem disabled={isDeleting} className="cursor-pointer p-0">
                <div
                  className="flex items-center gap-2 w-full px-2 py-1 rounded"
                  onClick={handleDelete}
                >
                  <Trash className="text-destructive" />
                  <span className="text-destructive">{t("Common.delete")}</span>
                  {isDeleting && (
                    <Loader className="ml-auto h-4 w-4 animate-spin" />
                  )}
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
