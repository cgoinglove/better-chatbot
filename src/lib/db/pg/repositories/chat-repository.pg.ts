import { ChatMessage, ChatRepository, ChatThread } from "app-types/chat";

import { pgDb as db } from "../db.pg";
import {
  ChatMessageSchema,
  ChatThreadSchema,
  UserSchema,
  ArchiveItemSchema,
} from "../schema.pg";

import { and, desc, eq, gte, sql } from "drizzle-orm";

export const pgChatRepository: ChatRepository = {
  insertThread: async (
    thread: Omit<ChatThread, "createdAt">,
  ): Promise<ChatThread> => {
    const [result] = await db
      .insert(ChatThreadSchema)
      .values({
        title: thread.title,
        userId: thread.userId,
        id: thread.id,
      })
      .returning();
    return result;
  },

  deleteChatMessage: async (id: string): Promise<void> => {
    await db.delete(ChatMessageSchema).where(eq(ChatMessageSchema.id, id));
  },

  selectThread: async (id: string): Promise<ChatThread | null> => {
    const [result] = await db
      .select()
      .from(ChatThreadSchema)
      .where(eq(ChatThreadSchema.id, id));
    return result;
  },

  selectThreadDetails: async (id: string) => {
    if (!id) {
      return null;
    }
    const [thread] = await db
      .select()
      .from(ChatThreadSchema)
      .leftJoin(UserSchema, eq(ChatThreadSchema.userId, UserSchema.id))
      .where(eq(ChatThreadSchema.id, id));

    if (!thread) {
      return null;
    }

    const messages = await pgChatRepository.selectMessagesByThreadId(id);
    return {
      id: thread.chat_thread.id,
      title: thread.chat_thread.title,
      userId: thread.chat_thread.userId,
      createdAt: thread.chat_thread.createdAt,
      userPreferences: thread.user?.preferences ?? undefined,
      messages,
    };
  },

  selectMessagesByThreadId: async (
    threadId: string,
  ): Promise<ChatMessage[]> => {
    const result = await db
      .select()
      .from(ChatMessageSchema)
      .where(eq(ChatMessageSchema.threadId, threadId))
      .orderBy(ChatMessageSchema.createdAt);
    return result as ChatMessage[];
  },

  selectThreadsByUserId: async (
    userId: string,
  ): Promise<
    (ChatThread & {
      lastMessageAt: number;
    })[]
  > => {
    const threadWithLatestMessage = await db
      .select({
        threadId: ChatThreadSchema.id,
        title: ChatThreadSchema.title,
        createdAt: ChatThreadSchema.createdAt,
        userId: ChatThreadSchema.userId,
        lastMessageAt: sql<string>`MAX(${ChatMessageSchema.createdAt})`.as(
          "last_message_at",
        ),
      })
      .from(ChatThreadSchema)
      .leftJoin(
        ChatMessageSchema,
        eq(ChatThreadSchema.id, ChatMessageSchema.threadId),
      )
      .where(eq(ChatThreadSchema.userId, userId))
      .groupBy(ChatThreadSchema.id)
      .orderBy(desc(sql`last_message_at`));

    return threadWithLatestMessage.map((row) => {
      return {
        id: row.threadId,
        title: row.title,
        userId: row.userId,
        createdAt: row.createdAt,
        lastMessageAt: row.lastMessageAt
          ? new Date(row.lastMessageAt).getTime()
          : 0,
      };
    });
  },

  updateThread: async (
    id: string,
    thread: Partial<Omit<ChatThread, "id" | "createdAt">>,
  ): Promise<ChatThread> => {
    const [result] = await db
      .update(ChatThreadSchema)
      .set({
        title: thread.title,
      })
      .where(eq(ChatThreadSchema.id, id))
      .returning();
    return result;
  },
  upsertThread: async (
    thread: Omit<ChatThread, "createdAt">,
  ): Promise<ChatThread> => {
    const [result] = await db
      .insert(ChatThreadSchema)
      .values(thread)
      .onConflictDoUpdate({
        target: [ChatThreadSchema.id],
        set: {
          title: thread.title,
        },
      })
      .returning();
    return result;
  },

  deleteThread: async (id: string): Promise<void> => {
    // 1. Delete all messages in the thread
    await db
      .delete(ChatMessageSchema)
      .where(eq(ChatMessageSchema.threadId, id));

    // 2. Remove thread from all archives
    await db.delete(ArchiveItemSchema).where(eq(ArchiveItemSchema.itemId, id));

    // 3. Delete the thread itself
    await db.delete(ChatThreadSchema).where(eq(ChatThreadSchema.id, id));
  },

  insertMessage: async (
    message: Omit<ChatMessage, "createdAt">,
  ): Promise<ChatMessage> => {
    const entity = {
      ...message,
      id: message.id,
    };
    const [result] = await db
      .insert(ChatMessageSchema)
      .values(entity)
      .returning();
    return result as ChatMessage;
  },

  upsertMessage: async (
    message: Omit<ChatMessage, "createdAt">,
  ): Promise<ChatMessage> => {
    const result = await db
      .insert(ChatMessageSchema)
      .values(message)
      .onConflictDoUpdate({
        target: [ChatMessageSchema.id],
        set: {
          parts: message.parts,
          annotations: message.annotations,
          attachments: message.attachments,
          model: message.model,
        },
      })
      .returning();
    return result[0] as ChatMessage;
  },

  deleteMessagesByChatIdAfterTimestamp: async (
    messageId: string,
  ): Promise<void> => {
    const [message] = await db
      .select()
      .from(ChatMessageSchema)
      .where(eq(ChatMessageSchema.id, messageId));
    if (!message) {
      return;
    }
    // Delete messages that are in the same thread AND created before or at the same time as the target message
    await db
      .delete(ChatMessageSchema)
      .where(
        and(
          eq(ChatMessageSchema.threadId, message.threadId),
          gte(ChatMessageSchema.createdAt, message.createdAt),
        ),
      );
  },

  deleteAllThreads: async (userId: string): Promise<void> => {
    const threadIds = await db
      .select({ id: ChatThreadSchema.id })
      .from(ChatThreadSchema)
      .where(eq(ChatThreadSchema.userId, userId));
    await Promise.all(
      threadIds.map((threadId) => pgChatRepository.deleteThread(threadId.id)),
    );
  },

  deleteUnarchivedThreads: async (userId: string): Promise<void> => {
    const unarchivedThreadIds = await db
      .select({ id: ChatThreadSchema.id })
      .from(ChatThreadSchema)
      .leftJoin(
        ArchiveItemSchema,
        eq(ChatThreadSchema.id, ArchiveItemSchema.itemId),
      )
      .where(
        and(
          eq(ChatThreadSchema.userId, userId),
          sql`${ArchiveItemSchema.id} IS NULL`,
        ),
      );

    await Promise.all(
      unarchivedThreadIds.map((threadId) =>
        pgChatRepository.deleteThread(threadId.id),
      ),
    );
  },

  insertMessages: async (
    messages: PartialBy<ChatMessage, "createdAt">[],
  ): Promise<ChatMessage[]> => {
    const result = await db
      .insert(ChatMessageSchema)
      .values(messages)
      .returning();
    return result as ChatMessage[];
  },
};
