import { sql } from "drizzle-orm";
import { pgTable, text as pgText, timestamp, uuid, boolean as pgBoolean, integer as pgInteger } from "drizzle-orm/pg-core";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// SQLite schema
export const CodeSnippetSqliteSchema = sqliteTable("code_snippet", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  description: text("description"),
  code: text("code").notNull(),
  language: text("language").notNull(),
  tags: text("tags"),
  isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL schema
export const CodeSnippetPgSchema = pgTable("code_snippet", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: pgText("title").notNull(),
  description: pgText("description"),
  code: pgText("code").notNull(),
  language: pgText("language").notNull(),
  tags: pgText("tags"),
  isFavorite: pgBoolean("is_favorite").notNull().default(false),
  userId: pgText("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
