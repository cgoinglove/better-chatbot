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

  const startNewChat = async () => {
    const threadId = generateUUID();
    await fetch(`/api/threads/${threadId}/project`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    router.push(`/chat/${threadId}`);
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
