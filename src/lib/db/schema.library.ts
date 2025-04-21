import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, json } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from "drizzle-orm/sqlite-core";

// SQLite schema
export const LibrarySqliteSchema = sqliteTable("library", {
  id: sqliteText("id").primaryKey().notNull(),
  name: sqliteText("name").notNull(),
  description: sqliteText("description"),
  userId: sqliteText("user_id").notNull(),
  createdAt: sqliteInteger("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: sqliteInteger("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const LibraryEntrySqliteSchema = sqliteTable("library_entry", {
  id: sqliteText("id").primaryKey().notNull(),
  libraryId: sqliteText("library_id").notNull(),
  title: sqliteText("title").notNull(),
  content: sqliteText("content").notNull(),
  source: sqliteText("source"), // Can be a thread ID, message ID, or other source identifier
  sourceType: sqliteText("source_type"), // "chat", "manual", etc.
  tags: sqliteText("tags"), // JSON string of tags
  createdAt: sqliteInteger("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: sqliteInteger("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL schema
export const LibraryPgSchema = pgTable("library", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const LibraryEntryPgSchema = pgTable("library_entry", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  libraryId: uuid("library_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source"), // Can be a thread ID, message ID, or other source identifier
  sourceType: text("source_type"), // "chat", "manual", etc.
  tags: json("tags").array(), // Array of tags
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
