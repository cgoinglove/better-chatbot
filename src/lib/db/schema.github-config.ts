import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  integer as sqliteInteger,
  sqliteTable,
  text as sqliteText,
} from "drizzle-orm/sqlite-core";

// SQLite schema
export const GitHubConfigSqliteSchema = sqliteTable("github_config", {
  id: sqliteText("id").primaryKey().notNull(),
  clientId: sqliteText("client_id").notNull(),
  clientSecret: sqliteText("client_secret").notNull(),
  redirectUri: sqliteText("redirect_uri").notNull(),
  webhookSecret: sqliteText("webhook_secret").notNull(),
  isActive: sqliteInteger("is_active", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: sqliteInteger("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: sqliteInteger("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL schema
export const GitHubConfigPgSchema = pgTable("github_config", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  webhookSecret: text("webhook_secret").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
