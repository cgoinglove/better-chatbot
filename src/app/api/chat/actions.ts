"use server";

import { generateText, LanguageModel, type Message } from "ai";

import { CREATE_THREAD_TITLE_PROMPT } from "lib/ai/prompts";

import type { ChatThread } from "app-types/chat";

import { getMockUserSession } from "lib/mock";

import { chatService } from "lib/db/chat-service";

const {
  deleteThread,
  deleteMessagesByChatIdAfterTimestamp,
  selectMessagesByThreadId,
  selectThread,
  selectThreadsByUserId,
  updateThread,
} = chatService;

export async function generateTitleFromUserMessageAction({
  message,
  model,
}: { message: Message; model: LanguageModel }) {
  console.log("Model", model.modelId);
  const { text: title } = await generateText({
    model,
    system: CREATE_THREAD_TITLE_PROMPT,
    prompt: JSON.stringify(message),
  });

  return title.trim();
}

export async function selectThreadWithMessagesAction(threadId: string) {
  const thread = await selectThread(threadId);
  if (!thread) {
    return null;
  }
  const messages = await selectMessagesByThreadId(threadId);
  return { ...thread, messages: messages ?? [] };
}

export async function deleteThreadAction(threadId: string) {
  await deleteThread(threadId);
}

export async function deleteMessagesByChatIdAfterTimestampAction(
  messageId: string,
) {
  await deleteMessagesByChatIdAfterTimestamp(messageId);
}

export async function selectThreadListByUserIdAction() {
  const userId: string = getMockUserSession().id;
  const threads = await selectThreadsByUserId(userId);
  return threads;
}

export async function updateThreadAction(
  thread: Omit<ChatThread, "createdAt" | "updatedAt" | "userId">,
) {
  await updateThread(thread.id, { ...thread, userId: getMockUserSession().id });
}
