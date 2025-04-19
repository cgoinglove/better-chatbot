import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, json, uuid } from "drizzle-orm/pg-core";

export const ChatThreadSchema = pgTable("chat_thread", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("").notNull(),
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

export type ChatThreadEntity = typeof ChatThreadSchema.$inferSelect;
export type ChatMessageEntity = typeof ChatMessageSchema.$inferSelect;
