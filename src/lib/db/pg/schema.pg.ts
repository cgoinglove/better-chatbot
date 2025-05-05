import { ChatMessage, Project } from "app-types/chat";
import { MCPServerBindingConfig } from "app-types/mcp";
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  json,
  uuid,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

export const ChatThreadSchema = pgTable("chat_thread", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  projectId: uuid("project_id"),
});

export const ChatMessageSchema = pgTable("chat_message", {
  id: text("id").primaryKey().notNull(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => ChatThreadSchema.id),
  role: text("role").notNull().$type<ChatMessage["role"]>(),
  parts: json("parts").notNull().array(),
  attachments: json("attachments").array(),
  annotations: json("annotations").array(),
  model: text("model"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ProjectSchema = pgTable("project", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id),
  instructions: json("instructions").$type<Project["instructions"]>(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const UserSchema = pgTable("user", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const McpServerBindingSchema = pgTable(
  "mcp_server_binding",
  {
    ownerType: text("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    config: jsonb("config")
      .$type<MCPServerBindingConfig>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (tbl) => [primaryKey({ columns: [tbl.ownerType, tbl.ownerId] })],
);

// export const McpServerSchema = pgTable("mcp_server", {
//   id: uuid("id").primaryKey().notNull().defaultRandom(),
//   name: text("name").notNull(),
//   config: json("config").notNull(),
//   enabled: boolean("enabled").notNull().default(true),
//   createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
// });

export type ChatThreadEntity = typeof ChatThreadSchema.$inferSelect;
export type ChatMessageEntity = typeof ChatMessageSchema.$inferSelect;
export type ProjectEntity = typeof ProjectSchema.$inferSelect;
export type UserEntity = typeof UserSchema.$inferSelect;
export type McpServerBindingEntity = typeof McpServerBindingSchema.$inferSelect;
// export type McpServerEntity = typeof McpServerSchema.$inferSelect;
