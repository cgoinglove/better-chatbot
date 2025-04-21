import { sql } from "drizzle-orm";
import { ensureCanvasTable } from "./canvas-service-init";
import { ensureCodeSnippetTable } from "./code-snippet-service-init";
import { sqliteDb } from "./db.sqlite";
import { ensureFileTables } from "./file-service-init";
import { ensureGithubTables } from "./github-service";
import { ensureLibraryTables } from "./library-service-init";
import { ensureRulesTable } from "./rules-service";
import { ChatMessageSchema, ChatThreadSchema } from "./schema.sqlite";
import { ensureVectorTables } from "./vector-service-init";

// Function to ensure the chat tables exist
export const ensureChatTables = async () => {
  if (process.env.USE_FILE_SYSTEM_DB === "true") {
    try {
      // Check if the chat_thread table exists
      await sqliteDb.select().from(ChatThreadSchema).limit(1);
    } catch (error) {
      console.log("Creating chat_thread table as it doesn't exist...");
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS chat_thread (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      console.log("Chat_thread table created successfully");
    }

    try {
      // Check if the chat_message table exists
      await sqliteDb.select().from(ChatMessageSchema).limit(1);
    } catch (error) {
      console.log("Creating chat_message table as it doesn't exist...");
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS chat_message (
          id TEXT PRIMARY KEY NOT NULL,
          thread_id TEXT NOT NULL,
          role TEXT NOT NULL,
          parts TEXT NOT NULL,
          attachments TEXT,
          model TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      console.log("Chat_message table created successfully");
    }
  }
};

// Function to initialize all database tables
export const initDatabase = async () => {
  if (process.env.USE_FILE_SYSTEM_DB === "true") {
    console.log("Initializing SQLite database tables...");
    try {
      await Promise.all([
        ensureChatTables(),
        ensureFileTables(),
        ensureCanvasTable(),
        ensureRulesTable(),
        ensureGithubTables(),
        ensureCodeSnippetTable(),
        ensureLibraryTables(),
        ensureVectorTables(),
      ]);
      console.log("All SQLite tables initialized successfully");
    } catch (error) {
      console.error("Error initializing SQLite tables:", error);
    }
  }
};

// Initialize the database tables
initDatabase().catch((err) => {
  console.error("Database initialization failed:", err);
});
