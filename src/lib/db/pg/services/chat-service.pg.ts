import { ChatMessage, ChatService, ChatThread, Project } from "app-types/chat";

import { pgDb as db } from "../db.pg";
import {
  ChatMessageSchema,
  ChatThreadSchema,
  McpServerBindingSchema,
  ProjectSchema,
} from "../schema.pg";

import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { MCPServerBindingOwnerType } from "app-types/mcp";
import { pgMcpService } from "./mcp-service.pg";

export const pgChatService: ChatService = {
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
    if (thread.projectId) {
      const mcpServerBinding = await pgMcpService.selectMcpServerBinding(
        thread.projectId,
        MCPServerBindingOwnerType.Project,
      );
      if (mcpServerBinding) {
        await pgMcpService.saveMcpServerBinding({
          ownerId: result.id,
          ownerType: MCPServerBindingOwnerType.Thread,
          config: mcpServerBinding.config,
        });
      }
    }
    return result;
  },

  selectThread: async (id: string): Promise<ChatThread | null> => {
    const [result] = await db
      .select()
      .from(ChatThreadSchema)
      .where(eq(ChatThreadSchema.id, id));
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

  selectThreadsByUserId: async (userId: string): Promise<ChatThread[]> => {
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
      .groupBy(
        ChatThreadSchema.id,
        ChatThreadSchema.title,
        ChatThreadSchema.createdAt,
      )
      .orderBy(desc(sql`last_message_at`));

    return threadWithLatestMessage.map((row) => {
      return {
        id: row.threadId,
        title: row.title,
        userId: row.userId,
        projectId: row.projectId,
        createdAt: row.createdAt,
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
    await db
      .delete(McpServerBindingSchema)
      .where(
        and(
          eq(McpServerBindingSchema.ownerId, id),
          eq(
            McpServerBindingSchema.ownerType,
            MCPServerBindingOwnerType.Thread,
          ),
        ),
      );
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
      threadIds.map((threadId) => pgChatService.deleteThread(threadId.id)),
    );
  },

  deleteAllThreads: async (userId: string): Promise<void> => {
    const threadIds = await db
      .select({ id: ChatThreadSchema.id })
      .from(ChatThreadSchema)
      .where(eq(ChatThreadSchema.userId, userId));
    await Promise.all(
      threadIds.map((threadId) => pgChatService.deleteThread(threadId.id)),
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
      })
      .from(ProjectSchema)
      .where(eq(ProjectSchema.userId, userId));
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
      threadIds.map((threadId) => pgChatService.deleteThread(threadId.id)),
    );
    await db
      .delete(McpServerBindingSchema)
      .where(
        and(
          eq(
            McpServerBindingSchema.ownerType,
            MCPServerBindingOwnerType.Project,
          ),
          eq(McpServerBindingSchema.ownerId, id),
        ),
      );
    await db.delete(ProjectSchema).where(eq(ProjectSchema.id, id));
  },
};
