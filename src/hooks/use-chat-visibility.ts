"use client";

import { updateChatVisibility } from "@/app/(chat)/actions";
import { VisibilityType } from "@/components/visibility-selector";
import { useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";

export function useChatVisibility({
  threadId,
  initialVisibility,
}: {
  threadId: string;
  initialVisibility: VisibilityType;
}) {
  const { mutate, cache } = useSWRConfig();
  const history: Array<Chat> = cache.get("/api/history")?.data;

  const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
    `${threadId}-visibility`,
    null,
    {
      fallbackData: initialVisibility,
    },
  );

  const visibilityType = useMemo(() => {
    if (!history) return localVisibility;
    const chat = history.find((chat) => chat.id === threadId);
    if (!chat) return "private";
    return chat.visibility;
  }, [history, threadId, localVisibility]);

  const setVisibilityType = (updatedVisibilityType: VisibilityType) => {
    setLocalVisibility(updatedVisibilityType);

    mutate<Array<Chat>>(
      "/api/history",
      (history) => {
        return history
          ? history.map((chat) => {
              if (chat.id === threadId) {
                return {
                  ...chat,
                  visibility: updatedVisibilityType,
                };
              }
              return chat;
            })
          : [];
      },
      { revalidate: false },
    );

    updateChatVisibility({
      threadId: threadId,
      visibility: updatedVisibilityType,
    });
  };

  return { visibilityType, setVisibilityType };
}
