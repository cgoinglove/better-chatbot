"use client";

import CommentForm from "./comment-form";
import Comment from "./comment";
import { Drawer, DrawerContent, DrawerTrigger } from "ui/drawer";
import { useMemo } from "react";
import { MessagesSquareIcon } from "lucide-react";
import { Button } from "ui/button";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import { ChatExportCommentWithUser } from "app-types/chat-export";

export default function Comments({
  id,
  children,
}: {
  id: string;
  children?: React.ReactNode;
}) {
  const { data } = useSWR<ChatExportCommentWithUser[]>(
    `/api/export/${id}/comments`,
    fetcher,
    {
      fallbackData: [],
      refreshInterval: 1000 * 10,
    },
  );

  const trigger = useMemo(() => {
    return (
      children ?? (
        <Button variant="ghost" size="icon" className="relative">
          <MessagesSquareIcon />
          {data && data.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {data.length}
            </span>
          )}
        </Button>
      )
    );
  }, [children, data]);

  return (
    <Drawer direction="right" modal>
      <DrawerTrigger>{trigger}</DrawerTrigger>
      <DrawerContent className="w-[500px] max-w-[90vw]">
        <div className="w-full h-full flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-lg">Comments</h3>
            <p className="text-sm text-muted-foreground">
              {data?.length === 0
                ? "No comments yet"
                : `${data?.length} comment${data?.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {data?.map((comment) => (
              <Comment key={comment.id} comment={comment} exportId={id} />
            ))}

            {data?.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Be the first to comment!
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border p-4">
            <CommentForm exportId={id} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
