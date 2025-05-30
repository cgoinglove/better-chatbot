import { selectThreadWithMessagesAction } from "@/app/api/chat/actions";
import ChatBot from "@/components/chat-bot";
import { cookies } from "next/headers";
import { ChatMessage, ChatThread } from "app-types/chat";
import { convertToUIMessage } from "lib/utils";
import { redirect } from "next/navigation";
import { DEFAULT_MODEL } from "lib/ai/models";

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
  const toolChoiceFromCookie = cookieStore.get("tool-choice");

  const initialMessages = thread.messages.map(convertToUIMessage);

  return (
    <ChatBot
      threadId={threadId}
      key={threadId}
      initialMessages={initialMessages}
      selectedModel={modelFromCookie?.value || DEFAULT_MODEL}
      selectedToolChoice={(toolChoiceFromCookie?.value as "auto" | "none" | "manual") || "auto"}
    />
  );
}
