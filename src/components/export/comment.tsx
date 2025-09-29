import { ChatExportCommentWithUser } from "app-types/chat-export";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Button } from "ui/button";
import { formatDistanceToNow } from "date-fns";
import { ReplyIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import CommentForm from "./comment-form";
import { useSWRConfig } from "swr";

export default function Comment({
  comment,
  exportId,
}: {
  comment: ChatExportCommentWithUser;
  exportId: string;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { mutate } = useSWRConfig();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      setIsDeleting(true);
      const response = await fetch(
        `/api/export/${exportId}/comments/${comment.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      // Refresh comments
      mutate(`/api/export/${exportId}/comments`);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReplySubmit = () => {
    setShowReplyForm(false);
    // Refresh comments
    mutate(`/api/export/${exportId}/comments`);
  };

  return (
    <div className="border-b border-border/50 pb-4 mb-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-8">
          <AvatarImage src={comment.authorImage} />
          <AvatarFallback>
            {comment.authorName?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-sm">{comment.authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            {/* Render TipTap content - for now just show text */}
            <div className="text-sm">
              {typeof comment.content === "string"
                ? comment.content
                : comment.content?.content
                    ?.map((block) =>
                      block.content
                        ?.map((item) =>
                          item.type === "text"
                            ? item.text
                            : item.type === "mention"
                              ? `@${item.attrs?.label}`
                              : "",
                        )
                        .join(""),
                    )
                    .join(" ")}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="h-7 px-2 text-xs"
            >
              <ReplyIcon className="size-3 mr-1" />
              Reply
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            >
              <TrashIcon className="size-3 mr-1" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>

          {showReplyForm && (
            <div className="mt-3">
              <CommentForm
                exportId={exportId}
                parentId={comment.id}
                onSubmit={handleReplySubmit}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {/* Render replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 ml-4 border-l-2 border-border/30 pl-4">
              {comment.replies.map((reply) => (
                <Comment key={reply.id} comment={reply} exportId={exportId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
