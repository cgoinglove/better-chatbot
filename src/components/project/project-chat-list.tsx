"use client";
import Link from "next/link";
import { MessageSquareIcon, PlusIcon } from "lucide-react";
import { formatTimeAgo } from "lib/date-utils";
import { Button } from "ui/button";
import { useRouter } from "next/navigation";

interface ProjectThread {
  id: string;
  title: string;
  createdAt: Date;
}

interface ProjectChatListProps {
  threads: ProjectThread[];
  projectId: string;
}

export function ProjectChatList({
  threads,
  projectId: _projectId,
}: ProjectChatListProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Chats
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => router.push(`/`)}
        >
          <PlusIcon className="size-3" />
          New chat
        </Button>
      </div>

      {threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquareIcon className="size-8 text-muted-foreground/30 mb-2" />
          <p className="text-muted-foreground text-sm">No chats yet</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/50 rounded-lg border border-border/50 overflow-hidden">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/chat/${thread.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-accent/40 transition-colors"
            >
              <span className="font-medium text-sm truncate">
                {thread.title || "Untitled Chat"}
              </span>
              <span className="text-xs text-muted-foreground shrink-0 ml-4">
                {formatTimeAgo(new Date(thread.createdAt))}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
