import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, boolean, integer } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from "drizzle-orm/sqlite-core";

// SQLite schema
export const RulesSqliteSchema = sqliteTable("rules", {
  id: sqliteText("id").primaryKey().notNull(),
  name: sqliteText("name").notNull(),
  content: sqliteText("content").notNull(),
  isEnabled: sqliteInteger("is_enabled", { mode: "boolean" }).notNull().default(true),
  priority: sqliteInteger("priority").notNull().default(0),
  userId: sqliteText("user_id").notNull(),
  createdAt: sqliteInteger("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: sqliteInteger("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL schema
export const RulesPgSchema = pgTable("rules", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
