import {
  ChatMessage,
  ChatRepository,
  ChatThread,
  Project,
} from "app-types/chat";

import { pgDb as db } from "../db.pg";
import {
  ChatMessageSchema,
  ChatThreadSchema,
  ProjectSchema,
  UserSchema,
} from "../schema.pg";

import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { pgUserRepository } from "./user-repository.pg";
import { UserPreferences } from "app-types/user";

export const pgChatRepository: ChatRepository = {
  insertThread: async (
    thread: Omit<ChatThread, "createdAt">,
  ): Promise<ChatThread> => {
    const [result] = await db
      .insert(ChatThreadSchema)
      .values({
        title: thread.title,
        userId: thread.userId,
        projectId: thread.projectId,
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
      .leftJoin(ProjectSchema, eq(ChatThreadSchema.projectId, ProjectSchema.id))
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
      projectId: thread.chat_thread.projectId,
      instructions: thread.project?.instructions ?? null,
      userPreferences: thread.user?.preferences ?? undefined,
      messages,
    };
  },

  selectThreadInstructionsByProjectId: async (userId, projectId) => {
    const result = {
      instructions: null as Project["instructions"] | null,
      userPreferences: undefined as UserPreferences | undefined,
    };

    const user = await pgUserRepository.findById(userId);

    if (!user) throw new Error("User not found");

    result.userPreferences = user.preferences;

    if (projectId) {
      const [project] = await db
        .select()
        .from(ProjectSchema)
        .where(eq(ProjectSchema.id, projectId));

      if (project) {
        result.instructions = project.instructions;
      }
    }

    return result;
  },

  selectThreadInstructions: async (userId, threadId) => {
    const result = {
      instructions: null as Project["instructions"] | null,
      userPreferences: undefined as UserPreferences | undefined,
      threadId: undefined as string | undefined,
      projectId: undefined as string | undefined,
    };

    const user = await pgUserRepository.findById(userId);

    if (!user) throw new Error("User not found");

    result.userPreferences = user.preferences;

    if (threadId) {
      const [thread] = await db
        .select({
          threadId: ChatThreadSchema.id,
          projectId: ChatThreadSchema.projectId,
          instructions: ProjectSchema.instructions,
        })
        .from(ChatThreadSchema)
        .leftJoin(
          ProjectSchema,
          eq(ChatThreadSchema.projectId, ProjectSchema.id),
        )
        .where(eq(ChatThreadSchema.id, threadId));
      if (thread) {
        result.instructions = thread.instructions;
        result.projectId = thread.projectId ?? undefined;
        result.threadId = thread.threadId;
      }
    }
    return result;
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
        projectId: ChatThreadSchema.projectId,
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
        projectId: row.projectId,
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
        projectId: thread.projectId,
        title: thread.title,
      })
      .where(eq(ChatThreadSchema.id, id))
      .returning();
    return result;
  },

  deleteThread: async (id: string): Promise<void> => {
    await db
      .delete(ChatMessageSchema)
      .where(eq(ChatMessageSchema.threadId, id));

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

  deleteNonProjectThreads: async (userId: string): Promise<void> => {
    const threadIds = await db
      .select({ id: ChatThreadSchema.id })
      .from(ChatThreadSchema)
      .where(
        and(
          eq(ChatThreadSchema.userId, userId),
          isNull(ChatThreadSchema.projectId),
        ),
      );
    await Promise.all(
      threadIds.map((threadId) => pgChatRepository.deleteThread(threadId.id)),
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

  insertProject: async (
    project: Omit<Project, "id" | "createdAt" | "updatedAt">,
  ): Promise<Project> => {
    const result = await db
      .insert(ProjectSchema)
      .values({
        ...project,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result[0] as Project;
  },

  selectProjectById: async (
    id: string,
  ): Promise<
    | (Project & {
        threads: ChatThread[];
      })
    | null
  > => {
    const result = await db
      .select({
        project: ProjectSchema,
        thread: ChatThreadSchema,
      })
      .from(ProjectSchema)
      .where(eq(ProjectSchema.id, id))
      .leftJoin(
        ChatThreadSchema,
        eq(ProjectSchema.id, ChatThreadSchema.projectId),
      );
    const project = result[0] ? result[0].project : null;
    const threads = result.map((row) => row.thread!).filter(Boolean);
    if (!project) {
      return null;
    }
    return { ...(project as Project), threads };
  },

  selectProjectsByUserId: async (
    userId: string,
  ): Promise<Omit<Project, "instructions">[]> => {
    const result = await db
      .select({
        id: ProjectSchema.id,
        name: ProjectSchema.name,
        createdAt: ProjectSchema.createdAt,
        updatedAt: ProjectSchema.updatedAt,
        userId: ProjectSchema.userId,
        lastThreadAt:
          sql<string>`COALESCE(MAX(${ChatThreadSchema.createdAt}), '1970-01-01')`.as(
            `last_thread_at`,
          ),
      })
      .from(ProjectSchema)
      .leftJoin(
        ChatThreadSchema,
        eq(ProjectSchema.id, ChatThreadSchema.projectId),
      )
      .where(eq(ProjectSchema.userId, userId))
      .groupBy(ProjectSchema.id)
      .orderBy(desc(sql`last_thread_at`), desc(ProjectSchema.createdAt));
    return result;
  },

  updateProject: async (
    id: string,
    project: Partial<Pick<Project, "name" | "instructions">>,
  ): Promise<Project> => {
    const [result] = await db
      .update(ProjectSchema)
      .set(project)
      .where(eq(ProjectSchema.id, id))
      .returning();
    return result as Project;
  },

  deleteProject: async (id: string): Promise<void> => {
    const threadIds = await db
      .select({ id: ChatThreadSchema.id })
      .from(ChatThreadSchema)
      .where(eq(ChatThreadSchema.projectId, id));
    await Promise.all(
      threadIds.map((threadId) => pgChatRepository.deleteThread(threadId.id)),
    );

    await db.delete(ProjectSchema).where(eq(ProjectSchema.id, id));
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
