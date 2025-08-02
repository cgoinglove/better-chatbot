"use client";

import type { Message } from "ai";
import { Button } from "./ui/button";
import { type Dispatch, type SetStateAction, useState } from "react";
import { Textarea } from "./ui/textarea";
import { deleteMessagesByChatIdAfterTimestampAction } from "@/app/api/chat/actions";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useTranslations } from "next-intl";
import { Loader } from "lucide-react";

type TextUIPart = {
  type: "text";
  text: string;
};

export type MessageEditorProps = {
  message: Message;
  setMode: Dispatch<SetStateAction<"view" | "edit">>;
  setMessages: UseChatHelpers["setMessages"];
  reload: UseChatHelpers["reload"];
};

export function MessageEditor({
  message,
  setMode,
  setMessages,
  reload,
}: MessageEditorProps) {
  const t = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [draftParts, setDraftParts] = useState<TextUIPart[]>(() => {
    if (message.parts && message.parts.length > 0) {
      return message.parts.map((part: any) => ({
        type: "text",
        text: part.text,
      }));
    }
    return [{ type: "text", text: "" }];
  });

  const handlePartChange = (index: number, value: string) => {
    setDraftParts((prev) => {
      const newParts = [...prev];
      newParts[index] = { type: "text", text: value };
      return newParts;
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full mb-4">
      {draftParts.map((part, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Textarea
            data-testid={`message-editor-part-${index}`}
            className="overflow-y-auto bg-transparent outline-none overflow-hidden resize-none !text-base rounded-xl w-full min-h-[100px]"
            value={part.text}
            onChange={(e) => handlePartChange(index, e.target.value)}
            placeholder={`Part ${index + 1}`}
          />
        </div>
      ))}

      <div className="flex flex-row gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-fit py-2 px-3"
          onClick={() => {
            setMode("view");
          }}
        >
          {t("Common.cancel")}
        </Button>
        <Button
          data-testid="message-editor-send-button"
          variant="default"
          size="sm"
          className="h-fit py-2 px-3"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);

            await deleteMessagesByChatIdAfterTimestampAction(message.id);

            setMessages((messages) => {
              const index = messages.findIndex((m) => m.id === message.id);

              if (index !== -1) {
                const updatedMessage: Message = {
                  ...message,
                  parts: draftParts,
                };

                return [...messages.slice(0, index), updatedMessage];
              }

              return messages;
            });

            setMode("view");
            reload({});
          }}
        >
          {isSubmitting ? t("Common.saving") : t("Common.save")}
          {isSubmitting && <Loader className="size-4 animate-spin" />}
        </Button>
      </div>
    </div>
  );
}
