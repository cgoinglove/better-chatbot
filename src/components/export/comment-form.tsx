"use client";

import { useState } from "react";
import { Button } from "ui/button";
import MentionInput from "../mention-input";
import { TipTapMentionJsonContent } from "app-types/util";
import { SendIcon } from "lucide-react";
import { useSWRConfig } from "swr";

export default function CommentForm({
  exportId,
  parentId,
  onSubmit,
  onCancel,
}: {
  exportId: string;
  parentId?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState<TipTapMentionJsonContent | null>(null);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate } = useSWRConfig();

  const handleSubmit = async () => {
    if (!content || !text.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/export/${exportId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          parentId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create comment");
      }

      // Reset form
      setContent(null);
      setText("");

      // Refresh comments
      mutate(`/api/export/${exportId}/comments`);

      onSubmit?.();
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContentChange = ({
    json,
    text,
  }: {
    json: TipTapMentionJsonContent;
    text: string;
    mentions: { label: string; id: string }[];
  }) => {
    setContent(json);
    setText(text);
  };

  return (
    <div className="space-y-3">
      <div className="border border-border rounded-lg p-3">
        <MentionInput
          placeholder="Write a comment..."
          onChange={handleContentChange}
          onEnter={handleSubmit}
          MentionItem={({ label }) => (
            <span className="px-1 py-0.5 bg-primary/10 text-primary rounded text-xs">
              @{label}
            </span>
          )}
          Suggestion={() => null} // Disable suggestions for now
          disabledMention={true}
        />
      </div>

      <div className="flex items-center gap-2 justify-end">
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!text.trim() || isSubmitting}
        >
          <SendIcon className="size-3 mr-1" />
          {isSubmitting ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
