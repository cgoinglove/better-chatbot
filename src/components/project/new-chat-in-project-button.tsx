"use client";
import { useRouter } from "next/navigation";
import { generateUUID } from "lib/utils";
import { ProjectBadge } from "./project-badge";

interface NewChatInProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function NewChatInProjectButton({
  projectId,
  projectName,
}: NewChatInProjectButtonProps) {
  const router = useRouter();

  const startNewChat = () => {
    const threadId = generateUUID();
    router.push(`/chat/${threadId}?projectId=${projectId}`);
  };

  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-3 cursor-text hover:border-border transition-colors"
      onClick={startNewChat}
    >
      <p className="text-sm text-muted-foreground/60 mb-3">
        Start a new chat...
      </p>
      <div className="flex items-center">
        <ProjectBadge name={projectName} />
      </div>
    </div>
  );
}
