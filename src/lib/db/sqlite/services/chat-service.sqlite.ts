import { ChatMessage, ChatService, ChatThread, Project } from "app-types/chat";

import { sqliteDb as db } from "../db.sqlite";
import {
  ChatMessageSchema,
  ChatThreadSchema,
  McpServerBindingSchema,
  ProjectSchema,
} from "../schema.sqlite";
import {
  convertToChatMessage,
  convertToChatThread,
  convertToDate,
  convertToProject,
  convertToTimestamp,
} from "./utils";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { MCPServerBindingOwnerType } from "app-types/mcp";
import { generateUUID } from "lib/utils";
import { sqliteMcpService } from "./mcp-service.sqlite";

/**
 * @deprecated
 */
export const sqliteChatService: ChatService = {
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
      const mcpServerBinding = await sqliteMcpService.selectMcpServerBinding(
        thread.projectId,
        MCPServerBindingOwnerType.Project,
      );
      if (mcpServerBinding) {
        await sqliteMcpService.saveMcpServerBinding({
          ownerId: result.id,
          ownerType: MCPServerBindingOwnerType.Thread,
          config: mcpServerBinding.config,
        });
      }
    }
    return convertToChatThread(result);
  },

  selectThread: async (id: string): Promise<ChatThread | null> => {
    const result = await db
      .select()
      .from(ChatThreadSchema)
      .where(eq(ChatThreadSchema.id, id));
    return result[0] ? convertToChatThread(result[0]) : null;
  },

  selectMessagesByThreadId: async (
    threadId: string,
  ): Promise<ChatMessage[]> => {
    const result = await db
      .select()
      .from(ChatMessageSchema)
      .where(eq(ChatMessageSchema.threadId, threadId))
      .orderBy(ChatMessageSchema.createdAt);
    return result.map(convertToChatMessage);
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
        createdAt: convertToDate(row.createdAt),
      };
    });
  },

  updateThread: async (
    id: string,
    thread: Partial<Omit<ChatThread, "id" | "createdAt">>,
  ): Promise<ChatThread> => {
    const result = await db
      .update(ChatThreadSchema)
      .set({
        projectId: thread.projectId,
        title: thread.title,
      })
      .where(eq(ChatThreadSchema.id, id))
      .returning();
    return convertToChatThread(result[0]);
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
    const result = await db
      .insert(ChatMessageSchema)
      .values({
        model: message.model || null,
        role: message.role,
        threadId: message.threadId,
        id: message.id,
        parts: JSON.stringify(message.parts),
        annotations: JSON.stringify(message.annotations),
        attachments: message.attachments
          ? JSON.stringify(message.attachments)
          : null,
      })
      .returning();
    return convertToChatMessage(result[0]);
  },

  upsertMessage: async (
    message: Omit<ChatMessage, "createdAt">,
  ): Promise<ChatMessage> => {
    const result = await db
      .insert(ChatMessageSchema)
      .values({
        id: message.id,
        model: message.model || null,
        role: message.role,
        threadId: message.threadId,
        parts: JSON.stringify(message.parts),
        annotations: JSON.stringify(message.annotations),
      })
      .onConflictDoUpdate({
        target: [ChatMessageSchema.id],
        set: {
          parts: JSON.stringify(message.parts),
          annotations: JSON.stringify(message.annotations),
          attachments: message.attachments
            ? JSON.stringify(message.attachments)
            : null,
        },
      })
      .returning();
    return convertToChatMessage(result[0]);
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
      threadIds.map((threadId) => sqliteChatService.deleteThread(threadId.id)),
    );
  },

  deleteAllThreads: async (userId: string): Promise<void> => {
    const threadIds = await db
      .select({ id: ChatThreadSchema.id })
      .from(ChatThreadSchema)
      .where(eq(ChatThreadSchema.userId, userId));
    await Promise.all(
      threadIds.map((threadId) => sqliteChatService.deleteThread(threadId.id)),
    );
  },

  insertProject: async (
    project: Omit<Project, "id" | "createdAt" | "updatedAt">,
  ): Promise<Project> => {
    const result = await db
      .insert(ProjectSchema)
      .values({
        name: project.name,
        userId: project.userId,
        id: generateUUID(),
        createdAt: convertToTimestamp(new Date()),
        updatedAt: convertToTimestamp(new Date()),
        instructions: JSON.stringify(project.instructions ?? []),
      })
      .returning();
    return convertToProject(result[0]);
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
    const project = result[0] ? convertToProject(result[0].project) : null;
    const threads = result
      .map((row) => row.thread!)
      .filter(Boolean)
      .map(convertToChatThread);
    if (!project) {
      return null;
    }
    return { ...project, threads };
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
    return result.map(convertToProject);
  },

  updateProject: async (
    id: string,
    project: Partial<Pick<Project, "name" | "instructions">>,
  ): Promise<Project> => {
    const result = await db
      .update(ProjectSchema)
      .set({
        updatedAt: convertToTimestamp(new Date()),
        instructions: project.instructions
          ? JSON.stringify(project.instructions)
          : undefined,
        name: project.name,
      })
      .where(eq(ProjectSchema.id, id))
      .returning();
    return convertToProject(result[0]);
  },

  deleteProject: async (id: string): Promise<void> => {
    const threadIds = await db
      .select({ id: ChatThreadSchema.id })
      .from(ChatThreadSchema)
      .where(eq(ChatThreadSchema.projectId, id));
    await Promise.all(
      threadIds.map((threadId) => sqliteChatService.deleteThread(threadId.id)),
    );
    await db
      .delete(McpServerBindingSchema)
      .where(
        and(
          eq(McpServerBindingSchema.ownerId, id),
          eq(
            McpServerBindingSchema.ownerType,
            MCPServerBindingOwnerType.Project,
          ),
        ),
      );
    await db.delete(ProjectSchema).where(eq(ProjectSchema.id, id));
  },
};
