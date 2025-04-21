import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, boolean, integer } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from "drizzle-orm/sqlite-core";

// SQLite schema
export const GitHubAccountSqliteSchema = sqliteTable("github_account", {
  id: sqliteText("id").primaryKey().notNull(),
  userId: sqliteText("user_id").notNull(),
  githubId: sqliteText("github_id").notNull(),
  username: sqliteText("username").notNull(),
  name: sqliteText("name"),
  email: sqliteText("email"),
  avatarUrl: sqliteText("avatar_url"),
  accessToken: sqliteText("access_token").notNull(),
  refreshToken: sqliteText("refresh_token"),
  tokenType: sqliteText("token_type").notNull(),
  scope: sqliteText("scope").notNull(),
  isActive: sqliteInteger("is_active", { mode: "boolean" }).notNull().default(true),
  expiresAt: sqliteInteger("expires_at"),
  createdAt: sqliteInteger("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: sqliteInteger("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL schema
export const GitHubAccountPgSchema = pgTable("github_account", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: text("user_id").notNull(),
  githubId: text("github_id").notNull(),
  username: text("username").notNull(),
  name: text("name"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").notNull(),
  scope: text("scope").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
