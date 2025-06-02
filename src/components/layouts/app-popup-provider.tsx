"use client";

import { KeyboardShortcutsPopup } from "@/components/keyboard-shortcuts-popup";
import { ChatPreferencesPopup } from "@/components/chat-preferences-popup";
import { ChatBotVoice } from "@/components/chat-bot-voice";
import { ChatBotTemporary } from "@/components/chat-bot-temporary";

export function AppPopupProvider() {
  return (
    <>
      <KeyboardShortcutsPopup />
      <ChatPreferencesPopup />
      <ChatBotVoice />
      <ChatBotTemporary />
    </>
  );
}
