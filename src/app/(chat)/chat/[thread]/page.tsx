import { selectThreadWithMessagesAction } from "@/app/api/chat/actions";
import ChatBot from "@/components/chat-bot";
import { UIMessage } from "ai";
import { ChatMessage, ChatThread } from "app-types/chat";
import { redirect } from "next/navigation";

function convertToUIMessage(message: ChatMessage): UIMessage {
  const um: UIMessage = {
    id: message.id,
    parts: message.parts as UIMessage["parts"],
    role: message.role as UIMessage["role"],
    content: "",
    annotations: message.annotations as UIMessage["annotations"],
    createdAt: new Date(message.createdAt),
  };
  return um;
}

const fetchThread = async (
  threadId: string,
): Promise<(ChatThread & { messages: ChatMessage[] }) | null> => {
  const response = await selectThreadWithMessagesAction(threadId);
  if (!response) return null;
  return response;
};

export default async function Page({
  params,
}: { params: Promise<{ thread: string }> }) {
  const { thread: threadId } = await params;

  const thread = await fetchThread(threadId);

  if (!thread) redirect("/");

  const initialMessages = thread.messages.map(convertToUIMessage);

  return (
    <ChatBot
      threadId={threadId}
      key={threadId}
      projectId={thread.projectId ?? undefined}
      initialMessages={initialMessages}
    />
  );
}
