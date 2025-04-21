import { sql } from "drizzle-orm";
import { pgTable, text as pgText, timestamp, uuid, integer as pgInteger } from "drizzle-orm/pg-core";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// SQLite schema
export const FileSqliteSchema = sqliteTable("file", {
  id: text("id").primaryKey().notNull(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  path: text("path").notNull(),
  mimetype: text("mimetype").notNull(),
  size: integer("size").notNull(),
  userId: text("user_id").notNull(),
  metadata: text("metadata"),
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const FileAttachmentSqliteSchema = sqliteTable("file_attachment", {
  id: text("id").primaryKey().notNull(),
  fileId: text("file_id").notNull().references(() => FileSqliteSchema.id, { onDelete: "cascade" }),
  messageId: text("message_id").notNull().references(() => ChatMessageSqliteSchema.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimetype: text("mimetype").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL schema
export const FilePgSchema = pgTable("file", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  filename: pgText("filename").notNull(),
  originalFilename: pgText("original_filename").notNull(),
  path: pgText("path").notNull(),
  mimetype: pgText("mimetype").notNull(),
  size: pgInteger("size").notNull(),
  userId: pgText("user_id").notNull(),
  metadata: pgText("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const FileAttachmentPgSchema = pgTable("file_attachment", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  fileId: uuid("file_id").notNull().references(() => FilePgSchema.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").notNull().references(() => ChatMessagePgSchema.id, { onDelete: "cascade" }),
  filename: pgText("filename").notNull(),
  mimetype: pgText("mimetype").notNull(),
  url: pgText("url").notNull(),
  thumbnailUrl: pgText("thumbnail_url"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Import these from the existing schema files
import { ChatMessageSchema as ChatMessagePgSchema } from "./schema.pg";
import { ChatMessageSchema as ChatMessageSqliteSchema } from "./schema.sqlite";
