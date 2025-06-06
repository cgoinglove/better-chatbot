"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "ui/dialog";
import { useObjectState } from "@/hooks/use-object-state";
import { UserPreferences } from "app-types/user";
import { safe } from "ts-safe";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import { Label } from "ui/label";
import { Input } from "ui/input";
import { ExamplePlaceholder } from "ui/example-placeholder";
import { Textarea } from "ui/textarea";
import { Button } from "ui/button";
import { Loader } from "lucide-react";
import { authClient } from "auth/client";
import { useTranslations } from "next-intl";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { isShortcutEvent, Shortcuts } from "lib/keyboard-shortcuts";

export function ChatPreferencesPopup() {
  const t = useTranslations();
  const [openChatPreferences, appStoreMutate] = appStore(
    useShallow((state) => [state.openChatPreferences, state.mutate]),
  );

  const responseStyleExamples = useMemo(
    () => [
      t("Chat.ChatPreferences.responseStyleExample1"),
      t("Chat.ChatPreferences.responseStyleExample2"),
      t("Chat.ChatPreferences.responseStyleExample3"),
      t("Chat.ChatPreferences.responseStyleExample4"),
    ],
    [],
  );

  const professionExamples = useMemo(
    () => [
      t("Chat.ChatPreferences.professionExample1"),
      t("Chat.ChatPreferences.professionExample2"),
      t("Chat.ChatPreferences.professionExample3"),
      t("Chat.ChatPreferences.professionExample4"),
      t("Chat.ChatPreferences.professionExample5"),
    ],
    [],
  );

  const { data: session } = authClient.useSession();
  const [preferences, setPreferences] = useObjectState<UserPreferences>({
    displayName: session?.user.name || "",
    responseStyleExample: "",
    profession: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const savePreferences = async () => {
    safe(() => setIsSaving(true))
      .ifOk(() =>
        fetch("/api/user/preferences", {
          method: "PUT",
          body: JSON.stringify(preferences),
        }),
      )
      .watch((result) => {
        if (result.isOk)
          toast.success(t("Chat.ChatPreferences.preferencesSaved"));
        else toast.error(t("Chat.ChatPreferences.failedToSavePreferences"));
      })
      .watch(() => setIsSaving(false))
      .ifOk(() => appStoreMutate({ openChatPreferences: false }));
  };
  const { mutate: fetchPreferences } = useSWR<UserPreferences>(
    "/api/user/preferences",
    fetcher,
    {
      fallback: {},
      onSuccess: (data) => {
        setPreferences(data);
      },
    },
  );

  useEffect(() => {
    if (openChatPreferences) {
      setPreferences({
        displayName: "",
        responseStyleExample: "",
        profession: "",
      });
      fetchPreferences();
    }
  }, [openChatPreferences]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isChatPreferencesEvent = isShortcutEvent(
        e,
        Shortcuts.openChatPreferences,
      );
      if (isChatPreferencesEvent) {
        e.preventDefault();
        e.stopPropagation();
        appStoreMutate((prev) => ({
          openChatPreferences: !prev.openChatPreferences,
        }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  return (
    <Dialog
      open={openChatPreferences}
      onOpenChange={() =>
        appStoreMutate({ openChatPreferences: !openChatPreferences })
      }
    >
      <DialogContent hideClose className="md:max-w-2xl">
        <DialogTitle>{t("Chat.ChatPreferences.title")}</DialogTitle>
        <DialogDescription>
          {/* Introduce yourself to receive more personalized responses. */}
        </DialogDescription>
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-2">
            <Label>{t("Chat.ChatPreferences.whatShouldWeCallYou")}</Label>
            <Input
              value={preferences.displayName}
              onChange={(e) => {
                setPreferences({
                  displayName: e.target.value,
                });
              }}
            />
          </div>

          <div className="flex flex-col gap-2 text-foreground flex-1">
            <Label>{t("Chat.ChatPreferences.whatBestDescribesYourWork")}</Label>
            <div className="relative w-full">
              <Input
                value={preferences.profession}
                onChange={(e) => {
                  setPreferences({
                    profession: e.target.value,
                  });
                }}
              />
              {(preferences.profession?.length ?? 0) === 0 && (
                <div className="absolute left-0 top-0 w-full h-full py-2 px-4 pointer-events-none">
                  <ExamplePlaceholder placeholder={professionExamples} />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 text-foreground">
            <Label>
              {t(
                "Chat.ChatPreferences.whatPersonalPreferencesShouldBeTakenIntoAccountInResponses",
              )}
            </Label>
            <span className="text-xs text-muted-foreground"></span>
            <div className="relative w-full">
              <Textarea
                className="min-h-24 max-h-44 resize-none"
                value={preferences.responseStyleExample}
                onChange={(e) => {
                  setPreferences({
                    responseStyleExample: e.target.value,
                  });
                }}
              />
              {(preferences.responseStyleExample?.length ?? 0) === 0 && (
                <div className="absolute left-0 top-0 w-full h-full py-2 px-4 pointer-events-none">
                  <ExamplePlaceholder placeholder={responseStyleExamples} />
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{t("Common.cancel")}</Button>
          </DialogClose>
          <Button disabled={isSaving} onClick={savePreferences}>
            {t("Common.save")}
            {isSaving && <Loader className="size-4 ml-2 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
