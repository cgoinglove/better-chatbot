"use client";

import { appStore } from "@/app/store";
import { useCompletion } from "@ai-sdk/react";
import { ChatModel } from "app-types/chat";
import { useCallback, useEffect } from "react";
import { mutate } from "swr";
import { safe } from "ts-safe";

export function useGenerateThreadTitle(option: {
  threadId: string;
  chatModel?: ChatModel;
}) {
  const { complete, completion } = useCompletion({
    api: "/api/chat/title",
  });

  const updateTitle = useCallback(
    (title: string) => {
      appStore.setState((prev) => {
        const exists = prev.threadList.some((v) => v.id === option.threadId);
        if (!exists) {
          return {
            threadList: [
              {
                id: option.threadId,
                title,
                userId: "",
                createdAt: new Date(),
              },
              ...prev.threadList,
            ],
          };
        }

        return {
          threadList: prev.threadList.map((v) =>
            v.id === option.threadId ? { ...v, title } : v,
          ),
        };
      });
    },
    [option.threadId],
  );

  const generateTitle = useCallback(
    (message: string) => {
      const { threadId, chatModel } = option;
      const trimmed = message.trim();
      if (!trimmed) return;
      if (appStore.getState().generatingTitleThreadIds.includes(threadId))
        return;

      appStore.setState((prev) => ({
        generatingTitleThreadIds: [...prev.generatingTitleThreadIds, threadId],
      }));

      safe(() => {
        updateTitle("");
        return complete("", {
          body: {
            message: trimmed,
            threadId,
            chatModel: chatModel ?? appStore.getState().chatModel,
          },
        });
      })
        .ifOk(() => mutate("/api/thread"))
        .watch(() => {
          appStore.setState((prev) => ({
            generatingTitleThreadIds: prev.generatingTitleThreadIds.filter(
              (v) => v !== threadId,
            ),
          }));
        });
    },
    [complete, option, updateTitle],
  );

  useEffect(() => {
    const title = completion.trim();
    if (title) {
      updateTitle(title);
    }
  }, [completion, updateTitle]);

  return generateTitle;
}
