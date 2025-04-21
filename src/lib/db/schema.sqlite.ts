import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { CanvasSqliteSchema } from "./schema.canvas";
import { CodeSnippetSqliteSchema } from "./schema.code-snippet";
import { FileAttachmentSqliteSchema, FileSqliteSchema } from "./schema.file";
import {
  GitHubFileIndexSqliteSchema,
  GitHubRepositorySqliteSchema,
} from "./schema.github";
import {
  LibraryEntrySqliteSchema,
  LibrarySqliteSchema,
} from "./schema.library";
import { RulesSqliteSchema } from "./schema.rules";

export const ChatThreadSchema = sqliteTable("chat_thread", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ChatMessageSchema = sqliteTable("chat_message", {
  id: text("id").primaryKey().notNull(),
  threadId: text("thread_id").notNull(),
  role: text("role").notNull(),
  parts: text("parts").notNull(),
  attachments: text("attachments"),
  model: text("model"),
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export {
  CanvasSqliteSchema,
  CodeSnippetSqliteSchema,
  FileAttachmentSqliteSchema,
  FileSqliteSchema,
  GitHubFileIndexSqliteSchema,
  GitHubRepositorySqliteSchema,
  LibraryEntrySqliteSchema,
  LibrarySqliteSchema,
  RulesSqliteSchema,
};
