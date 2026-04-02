import { selectThreadWithMessagesAction } from "@/app/api/chat/actions";
import ChatBot from "@/components/chat-bot";

import { ChatMessage, ChatThread } from "app-types/chat";
import { chatRepository, projectRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { redirect, RedirectType } from "next/navigation";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ thread: string }>;
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { thread: threadId } = await params;
  const { projectId: projectIdParam } = await searchParams;

  let thread: (ChatThread & { messages: ChatMessage[] }) | null =
    await selectThreadWithMessagesAction(threadId);

  if (!thread) {
    if (projectIdParam) {
      const session = await getSession();
      if (session?.user.id) {
        const project = await projectRepository.selectProjectById(
          projectIdParam,
          session.user.id,
        );
        if (project) {
          await chatRepository.insertThread({
            id: threadId,
            title: "New Chat",
            userId: session.user.id,
            projectId: projectIdParam,
          });
          thread = await selectThreadWithMessagesAction(threadId);
        }
      }
    }
    if (!thread) redirect("/", RedirectType.replace);
  }

  let projectName: string | undefined;
  const effectiveProjectId = thread?.projectId;
  if (effectiveProjectId) {
    const session = await getSession();
    if (session?.user.id) {
      const project = await projectRepository.selectProjectById(
        effectiveProjectId,
        session.user.id,
      );
      projectName = project?.name;
    }
  }

  return (
    <ChatBot
      threadId={threadId}
      initialMessages={thread?.messages ?? []}
      projectId={effectiveProjectId ?? undefined}
      projectName={projectName}
    />
  );
}
