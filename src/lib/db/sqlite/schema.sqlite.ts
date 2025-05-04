import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const ChatThreadSchema = sqliteTable("chat_thread", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  projectId: text("project_id"),
});

export const ChatMessageSchema = sqliteTable("chat_message", {
  id: text("id").primaryKey().notNull(),
  threadId: text("thread_id").notNull(),
  role: text("role").notNull(),
  parts: text("parts").notNull(),
  attachments: text("attachments"),
  annotations: text("annotations"),
  model: text("model"),
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ProjectSchema = sqliteTable("project", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  instructions: text("instructions"),
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const UserSchema = sqliteTable("user", {
  id: text("id").primaryKey().notNull().default(sql`(random())`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  image: text("image"),
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// export const McpServerSchema = sqliteTable("mcp_server", {
//   id: text("id").primaryKey().notNull().default(sql`(random())`),
//   enabled: integer("enabled").notNull().default(1),
//   name: text("name").notNull(),
//   config: text("config").notNull(),
//   createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: integer("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
// });
