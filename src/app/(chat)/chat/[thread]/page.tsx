import { selectThreadWithMessagesAction } from "@/app/api/chat/actions";
import ChatBot from "@/components/chat-bot";

import { ChatMessage, ChatThread } from "app-types/chat";
import { projectRepository } from "lib/db/repository";
import { redirect, RedirectType } from "next/navigation";

const fetchThread = async (
  threadId: string,
): Promise<(ChatThread & { messages: ChatMessage[] }) | null> => {
  return await selectThreadWithMessagesAction(threadId);
};

export default async function Page({
  params,
}: { params: Promise<{ thread: string }> }) {
  const { thread: threadId } = await params;

  const thread = await fetchThread(threadId);

  if (!thread) redirect("/", RedirectType.replace);

  let projectName: string | undefined;
  if (thread.projectId) {
    const project = await projectRepository.selectProjectById(
      thread.projectId,
      thread.userId,
    );
    projectName = project?.name;
  }

  return (
    <ChatBot
      threadId={threadId}
      initialMessages={thread.messages}
      projectId={thread.projectId ?? undefined}
      projectName={projectName}
    />
  );
}
