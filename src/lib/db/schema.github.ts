import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, boolean, integer } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from "drizzle-orm/sqlite-core";

// SQLite schema
export const GitHubRepositorySqliteSchema = sqliteTable("github_repository", {
  id: sqliteText("id").primaryKey().notNull(),
  name: sqliteText("name").notNull(),
  path: sqliteText("path").notNull(),
  description: sqliteText("description"),
  isEnabled: sqliteInteger("is_enabled", { mode: "boolean" }).notNull().default(true),
  lastIndexed: sqliteInteger("last_indexed"),
  userId: sqliteText("user_id").notNull(),
  createdAt: sqliteInteger("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: sqliteInteger("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL schema
export const GitHubRepositoryPgSchema = pgTable("github_repository", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastIndexed: timestamp("last_indexed"),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// File index schema for SQLite
export const GitHubFileIndexSqliteSchema = sqliteTable("github_file_index", {
  id: sqliteText("id").primaryKey().notNull(),
  repositoryId: sqliteText("repository_id").notNull().references(() => GitHubRepositorySqliteSchema.id, { onDelete: "cascade" }),
  filePath: sqliteText("file_path").notNull(),
  content: sqliteText("content"),
  language: sqliteText("language"),
  lastIndexed: sqliteInteger("last_indexed").notNull(),
  createdAt: sqliteInteger("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: sqliteInteger("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// File index schema for PostgreSQL
export const GitHubFileIndexPgSchema = pgTable("github_file_index", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  repositoryId: uuid("repository_id").notNull().references(() => GitHubRepositoryPgSchema.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  content: text("content"),
  language: text("language"),
  lastIndexed: timestamp("last_indexed").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
