"use client";

import { Check, Copy, X } from "lucide-react";
import { useState } from "react";
import { Button } from "ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Textarea } from "ui/textarea";
import { Markdown } from "./markdown";
import { useCopy } from "@/hooks/use-copy";

type MessagePastesContentCardProps = {
  initialContent: string;
  readonly?: boolean;
  updateContent?: (content: string) => void;
  deleteContent?: () => void;
};

export function MessagePastesContentCard({
  initialContent,
  updateContent,
  deleteContent,
  readonly,
}: MessagePastesContentCardProps) {
  const [content, setContent] = useState(initialContent);
  const { copied, copy } = useCopy();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="group/pastes-content cursor-pointer flex flex-col gap-2  border bg-card w-32 h-32 rounded-xl relative hover:border-primary/60 transition-all duration-300">
          <p className="text-sm p-4 text-muted-foreground whitespace-pre-wrap text-[6px] w-full h-full overflow-hidden">
            {content.slice(0, 400)}
          </p>
          {!readonly && (
            <Button
              className="hover:bg-input! opacity-0 group-hover/pastes-content:opacity-100 transition-all duration-300 z-10 absolute top-0 right-0"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                deleteContent?.();
              }}
            >
              <X />
            </Button>
          )}
          <div className="absolute overflow-hidden w-full h-full rounded-[inherit]">
            <div className="absolute bottom-0 left-0 h-1/3 w-full bg-gradient-to-b from-transparent to-background  pointer-events-none" />
            <div className="absolute top-0 left-0 h-1/3 w-full bg-gradient-to-t from-transparent to-background  pointer-events-none" />
          </div>
        </div>
      </DialogTrigger>
      <DialogPortal>
        <DialogContent
          hideClose
          className="sm:max-w-[80vh] fixed p-10 overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              PASTED
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  copy(content);
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </DialogTitle>
          </DialogHeader>
          {readonly ? (
            <div className="max-h-[70vh] overflow-y-auto">
              <Markdown>{content}</Markdown>
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="resize-none max-h-[70vh] overflow-y-auto"
            />
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">CLOSE</Button>
            </DialogClose>
            {!readonly && (
              <DialogClose asChild>
                <Button onClick={() => updateContent?.(content)}>Save</Button>
              </DialogClose>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
