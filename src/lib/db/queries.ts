import "server-only";

import { genSaltSync, hashSync } from "bcrypt-ts";
import { and, asc, desc, eq, gt } from 'drizzle-orm';

import {
  UserSchema,
  ChatThreadSchema,
  ChatMessageSchema,
  DocumentSchema,
  type Document,
} from "./pg/schema.pg";
import type { ArtifactKind } from "@/components/artifact";
import { pgDb as db } from './pg/db.pg';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

export async function getUser(email: string): Promise<Array<UserEntity>> {
  try {
    return await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function createUser(
  email: string,
  password: string,
  name?: string,
): Promise<Array<UserEntity>> {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db
      .insert(UserSchema)
      .values({
        email,
        password: hash,
        name: name || email.split("@")[0],
        emailVerified: false,
        preferences: {},
      })
      .returning();
  } catch (error) {
    console.error("Failed to create user in database");
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
  projectId,
}: {
  id: string;
  userId: string;
  title: string;
  projectId?: string;
}): Promise<Array<ChatThreadEntity>> {
  try {
    return await db
      .insert(ChatThreadSchema)
      .values({
        id,
        userId,
        title,
        projectId,
      })
      .returning();
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({
  id,
}: { id: string }): Promise<Array<ChatThreadEntity>> {
  try {
    // First delete related messages
    await db
      .delete(ChatMessageSchema)
      .where(eq(ChatMessageSchema.threadId, id));

    // Then delete the thread
    return await db.delete(ChatThreadSchema).where(eq(ChatThreadSchema.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({
  id,
}: { id: string }): Promise<Array<ChatThreadEntity>> {
  try {
    return await db
      .select()
      .from(ChatThreadSchema)
      .where(eq(ChatThreadSchema.userId, id))
      .orderBy(desc(ChatThreadSchema.createdAt));
  } catch (error) {
    console.error("Failed to get chats by user id from database");
    throw error;
  }
}

export async function getChatById({
  id,
}: { id: string }): Promise<Array<ChatThreadEntity>> {
  try {
    return await db
      .select()
      .from(ChatThreadSchema)
      .where(eq(ChatThreadSchema.id, id));
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function saveMessages(
  messages: ChatMessageEntity[],
): Promise<Array<ChatMessageEntity>> {
  try {
    return await db
      .insert(ChatMessageSchema)
      .values(messages)
      .returning();
  } catch (error) {
    console.error("Failed to save messages in database");
    throw error;
  }
}

export async function getMessagesByChatId({
  chatId,
}: { chatId: string }): Promise<Array<ChatMessageEntity>> {
  try {
    return await db
      .select()
      .from(ChatMessageSchema)
      .where(eq(ChatMessageSchema.threadId, chatId))
      .orderBy(asc(ChatMessageSchema.createdAt));
  } catch (error) {
    console.error("Failed to get messages by chat id from database");
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}): Promise<Array<Vote>> {
  try {
    await db
      .insert(VoteSchema)
      .values({
        chatId,
        messageId,
        isUpvoted: type === "up",
      })
      .onConflictDoUpdate({
        target: [VoteSchema.chatId, VoteSchema.messageId],
        set: {
          isUpvoted: type === "up",
        },
      });

    return await db
      .select()
      .from(VoteSchema)
      .where(
        and(eq(VoteSchema.chatId, chatId), eq(VoteSchema.messageId, messageId)),
      );
  } catch (error) {
    console.error('Failed to vote message in database');
    throw error;
  }
}

export async function getVotesByChatId({
  id,
}: { id: string }): Promise<Array<Vote>> {
  try {
    return await db.select().from(VoteSchema).where(eq(VoteSchema.chatId, id));
  } catch (error) {
    console.error("Failed to get votes by chat id from database");
    throw error;
  }
}

export async function saveDocument({
  id,
  userId,
  title,
  content,
  kind,
}: {
  id: string;
  userId: string;
  title: string;
  content: string;
  kind: ArtifactKind;
}): Promise<Array<Document>> {
  try {
    return await db
      .insert(DocumentSchema)
      .values({
        id,
        user_id: userId,
        title,
        content,
        kind,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
  } catch (error) {
    console.error("Failed to save document in database");
    throw error;
  }
}

export async function getDocumentsByUserId({ id }: { id: string }): Promise<Array<Document>> {
  try {
    return await db
      .select()
      .from(DocumentSchema)
      .where(eq(DocumentSchema.user_id, id))
      .orderBy(desc(DocumentSchema.createdAt));
  } catch (error) {
    console.error("Failed to get documents by user id from database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }): Promise<Array<Document>> {
  try {
    return await db
      .select()
      .from(DocumentSchema)
      .where(eq(DocumentSchema.id, id));
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}): Promise<Array<DocumentEntity>> {
  try {
    await db
      .delete(SuggestionSchema)
      .where(
        and(
          eq(SuggestionSchema.documentId, id),
          gt(SuggestionSchema.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(DocumentSchema)
      .where(
        and(eq(DocumentSchema.id, id), gt(DocumentSchema.createdAt, timestamp)),
      );
  } catch (error) {
    console.error(
      "Failed to delete documents by id after timestamp from database",
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}): Promise<Array<Suggestion>> {
  try {
    return await db.insert(SuggestionSchema).values(suggestions);
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}): Promise<Array<Suggestion>> {
  try {
    return await db
      .select()
      .from(SuggestionSchema)
      .where(and(eq(SuggestionSchema.documentId, documentId)));
  } catch (error) {
    console.error(
      "Failed to get suggestions by document version from database",
    );
    throw error;
  }
}

export async function getMessageById({
  id,
}: { id: string }): Promise<Array<ChatMessageEntity>> {
  try {
    return await db
      .select()
      .from(ChatMessageSchema)
      .where(eq(ChatMessageSchema.id, id));
  } catch (error) {
    console.error("Failed to get message by id from database");
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}): Promise<Array<ChatMessageEntity>> {
  try {
    return await db
      .delete(ChatMessageSchema)
      .where(
        and(
          eq(ChatMessageSchema.threadId, chatId),
          gt(ChatMessageSchema.createdAt, timestamp),
        ),
      )
      .returning();
  } catch (error) {
    console.error(
      'Failed to delete messages by chat id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}): Promise<Array<ChatThreadEntity>> {
  try {
    return await db
      .update(ChatThreadSchema)
      .set({ visibility })
      .where(eq(ChatThreadSchema.id, chatId))
      .returning();
  } catch (error) {
    console.error('Failed to update chat visibility by id in database');
    throw error;
  }
}
