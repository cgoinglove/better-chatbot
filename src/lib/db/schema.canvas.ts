import { sql } from "drizzle-orm";
import { pgTable, text as pgText, timestamp, uuid } from "drizzle-orm/pg-core";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// SQLite schema
export const CanvasSqliteSchema = sqliteTable("canvas", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL schema
export const CanvasPgSchema = pgTable("canvas", {
  id: uuid("id").primaryKey().notNull(),
  title: pgText("title").notNull(),
  content: pgText("content").notNull(),
  userId: pgText("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
