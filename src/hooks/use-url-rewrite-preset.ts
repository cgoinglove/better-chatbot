"use client";

import { useEffect, useRef, useState } from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { appStore } from "@/app/store";
import { getStorageManager } from "lib/browser-stroage";
import { buildPresetStatePatch } from "lib/url-rewrite/apply-preset";
import type { ChatLinkPreset } from "app-types/url-rewrite";

export type UrlRewriteIntent = {
  intentId: string;
  slug: string;
  preset: ChatLinkPreset;
};

const appliedIntentStorage = getStorageManager<string[]>(
  "GOTO_APPLIED_INTENTS",
  "session",
);

/**
 * Applies the preset carried by an admin-created `/goto/{slug}` link.
 *
 * Runs in two phases on purpose: the chat transport reads the model, mentions
 * and tool settings out of a ref that is refreshed on render
 * (`chat-bot.tsx` `latestRef`), so an auto-sent message has to wait for the
 * render that follows the store update - otherwise it would be sent with the
 * previous model and no tools.
 */
export function useUrlRewritePreset({
  threadId,
  intent,
  enabled,
  setInput,
  sendMessage,
}: {
  threadId: string;
  intent?: UrlRewriteIntent | null;
  enabled: boolean;
  setInput: (input: string) => void;
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
}) {
  const appliedRef = useRef(false);
  const [pendingSend, setPendingSend] = useState<string | null>(null);

  // Phase 1 - seed the store (and the input for "prefill" links).
  useEffect(() => {
    if (!enabled || !intent || appliedRef.current) return;

    const alreadyApplied = appliedIntentStorage.get([]);
    if (alreadyApplied.includes(intent.intentId)) {
      appliedRef.current = true;
      return;
    }
    appliedRef.current = true;
    appliedIntentStorage.set([...alreadyApplied, intent.intentId].slice(-20));

    const { preset } = intent;

    appStore.setState((prev) =>
      buildPresetStatePatch(preset, threadId, prev.threadMentions),
    );

    if (preset.message) {
      if (preset.message.mode === "send") {
        setPendingSend(preset.message.text);
      } else {
        setInput(preset.message.text);
      }
    }

    // Fire and forget: the session guard above already prevents a double apply
    // if this round trip is slow.
    fetch("/api/url-rewrite/goto-intent", { method: "DELETE" }).catch(() => {});
  }, [enabled, intent, threadId, setInput]);

  // Phase 2 - the store update has rendered, the message can go out.
  useEffect(() => {
    if (!pendingSend) return;
    setPendingSend(null);
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: pendingSend }],
    });
  }, [pendingSend, sendMessage]);
}
