import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, jsonb, integer as pgInteger } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer } from "drizzle-orm/sqlite-core";

// PostgreSQL schema for document embeddings
export const DocumentEmbeddingPgSchema = pgTable("document_embedding", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  documentId: uuid("document_id").notNull(),
  libraryId: uuid("library_id").notNull(),
  userId: text("user_id").notNull(),
  chunkIndex: pgInteger("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: jsonb("embedding").notNull(), // Store embedding as JSON array
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// SQLite schema for document embeddings
export const DocumentEmbeddingSqliteSchema = sqliteTable("document_embedding", {
  id: sqliteText("id").primaryKey().notNull(),
  documentId: sqliteText("document_id").notNull(),
  libraryId: sqliteText("library_id").notNull(),
  userId: sqliteText("user_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: sqliteText("content").notNull(),
  embedding: sqliteText("embedding").notNull(), // Store embedding as JSON string
  metadata: sqliteText("metadata"), // Store metadata as JSON string
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// PostgreSQL schema for documents
export const DocumentPgSchema = pgTable("document", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  libraryId: uuid("library_id").notNull(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  filePath: text("file_path"),
  mimeType: text("mime_type"),
  size: pgInteger("size"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// SQLite schema for documents
export const DocumentSqliteSchema = sqliteTable("document", {
  id: sqliteText("id").primaryKey().notNull(),
  libraryId: sqliteText("library_id").notNull(),
  userId: sqliteText("user_id").notNull(),
  title: sqliteText("title").notNull(),
  description: sqliteText("description"),
  filePath: sqliteText("file_path"),
  mimeType: sqliteText("mime_type"),
  size: integer("size"),
  metadata: sqliteText("metadata"), // Store metadata as JSON string
  createdAt: integer("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
