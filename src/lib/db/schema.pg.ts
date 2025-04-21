import { sql } from "drizzle-orm";
import { json, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { CanvasPgSchema } from "./schema.canvas";
import { CodeSnippetPgSchema } from "./schema.code-snippet";
import { FileAttachmentPgSchema, FilePgSchema } from "./schema.file";
import {
  GitHubFileIndexPgSchema,
  GitHubRepositoryPgSchema,
} from "./schema.github";
import { LibraryEntryPgSchema, LibraryPgSchema } from "./schema.library";
import { RulesPgSchema } from "./schema.rules";

export const ChatThreadSchema = pgTable("chat_thread", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ChatMessageSchema = pgTable("chat_message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  threadId: uuid("thread_id").notNull(),
  role: text("role").notNull(),
  parts: json("parts").notNull().array(),
  attachments: json("attachments").array(),
  model: text("model"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export {
  CanvasPgSchema,
  CodeSnippetPgSchema,
  FileAttachmentPgSchema,
  FilePgSchema,
  GitHubFileIndexPgSchema,
  GitHubRepositoryPgSchema,
  LibraryEntryPgSchema,
  LibraryPgSchema,
  RulesPgSchema,
};

export type ChatThreadEntity = typeof ChatThreadSchema.$inferSelect;
export type ChatMessageEntity = typeof ChatMessageSchema.$inferSelect;
