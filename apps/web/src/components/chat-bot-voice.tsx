"use client";

import { useGlobalShortcut } from "@/hooks/use-global-shortcut";
import { isNull } from "lib/utils";
import { useEffect } from "react";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import dynamic from "next/dynamic";
import { isShortcutEvent, Shortcuts } from "lib/keyboard-shortcuts";

const VoiceChatSession = dynamic(
  () => import("./chat-bot-voice-session").then((mod) => mod.VoiceChatSession),
  { ssr: false },
);

/**
 * Lightweight shell: keyboard shortcut + lazy-loaded realtime session.
 * Heavy deps (@ai-sdk/react realtime) load only when voice chat opens.
 */
export function ChatBotVoice() {
  const [isOpen, agentId, appStoreMutate] = appStore(
    useShallow((state) => [
      state.voiceChat.isOpen,
      state.voiceChat.agentId,
      state.mutate,
    ]),
  );

  useEffect(() => {
    if (!isOpen && !isNull(agentId)) {
      appStoreMutate((prev) => ({
        voiceChat: {
          ...prev.voiceChat,
          agentId: undefined,
        },
      }));
    }
  }, [isOpen, agentId, appStoreMutate]);

  useGlobalShortcut(
    (e: KeyboardEvent) => {
      if (isOpen) return;
      const isVoiceChatEvent = isShortcutEvent(e, Shortcuts.toggleVoiceChat);
      if (isVoiceChatEvent) {
        e.preventDefault();
        e.stopPropagation();
        appStoreMutate((prev) => ({
          voiceChat: {
            ...prev.voiceChat,
            isOpen: true,
            agentId: undefined,
          },
        }));
      }
    },
    [isOpen, appStoreMutate],
  );

  if (!isOpen) return null;

  return <VoiceChatSession />;
}
