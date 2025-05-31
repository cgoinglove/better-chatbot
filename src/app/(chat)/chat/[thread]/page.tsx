import { selectThreadWithMessagesAction } from "@/app/api/chat/actions";
import ChatBot from "@/components/chat-bot";
import { cookies } from "next/headers";
import { ChatMessage, ChatThread } from "app-types/chat";
import { convertToUIMessage } from "lib/utils";
import { redirect } from "next/navigation";
import { DEFAULT_MODEL } from "lib/ai/models";
import { DataStreamHandler } from "@/components/data-stream-handler";

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

  const cookieStore = await cookies();
  const modelFromCookie = cookieStore.get("chat-model");

  const initialMessages = thread.messages.map(m => ({
  ...convertToUIMessage(m),
  threadId: thread.id,
}));

  return (
    <>
      <ChatBot
        threadId={threadId}
        key={threadId}
        initialMessages={initialMessages}
        selectedChatModel={modelFromCookie?.value || DEFAULT_MODEL}
        slots={{}}
      />
      <DataStreamHandler id={threadId} />
    </>
  );
}
