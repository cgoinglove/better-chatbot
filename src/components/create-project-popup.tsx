"use client";
import { insertProjectAction } from "@/app/api/chat/actions";
import { Lightbulb, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import React, {
  KeyboardEvent,
  PropsWithChildren,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { safe } from "ts-safe";
import { Button } from "ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Input } from "ui/input";
import { handleErrorWithToast } from "ui/shared-toast";
import { useTranslations } from "next-intl";
import { FlipWords } from "ui/flip-words";

export function CreateProjectPopup({ children }: PropsWithChildren) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const router = useRouter();

  const handleCreate = async () => {
    safe(() => setIsLoading(true))
      .map(() => insertProjectAction({ name }))
      .watch(() => setIsLoading(false))
      .ifOk(() => setIsOpen(false))
      .ifOk(() => toast.success(t("Chat.Project.projectCreated")))
      .ifOk(() => mutate("projects"))
      .ifOk((project) => router.push(`/project/${project.id}`))
      .ifFail(handleErrorWithToast);
  };

  const handleEnterKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      handleCreate();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setName("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("Chat.Project.project")}</DialogTitle>
          <DialogDescription asChild className="bg-transparent my-0!">
            <div className="my-2 p-4 flex bg-muted rounded-lg gap-2">
              <div className="px-2 mt-1">
                <Lightbulb className="size-4 text-accent-foreground animate-pulse" />
              </div>
              <div className="">
                <p className="font-semibold text-accent-foreground mb-1">
                  {t("Chat.Project.whatIsAProject")}
                </p>
                <FlipWords
                  className="text-muted-foreground px-0"
                  words={[
                    t(
                      "Chat.Project.aProjectAllowsYouToOrganizeYourFilesAndCustomInstructionsInOneConvenientPlace",
                    ),
                  ]}
                />
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="w-full">
          <Input
            autoFocus
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleEnterKey}
            placeholder={t("Chat.Project.enterNameForNewProject")}
            className="bg-card flex-1"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild disabled={isLoading}>
            <Button variant="ghost">{t("Common.cancel")}</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={isLoading || !name.trim()}
            onClick={handleCreate}
            variant={"secondary"}
          >
            {isLoading && <Loader className="size-4 animate-spin" />}
            {t("Common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
