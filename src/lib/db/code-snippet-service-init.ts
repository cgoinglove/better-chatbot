import { sql } from "drizzle-orm";
import { sqliteDb } from "./db.sqlite";
import { CodeSnippetSqliteSchema } from "./schema.code-snippet";

// Function to ensure the code snippet table exists
export const ensureCodeSnippetTable = async () => {
  if (process.env.USE_FILE_SYSTEM_DB === "true") {
    try {
      // Check if the code_snippet table exists by trying to query it
      await sqliteDb.select().from(CodeSnippetSqliteSchema).limit(1);
    } catch (error) {
      console.log("Creating code_snippet table as it doesn't exist...");
      // If the table doesn't exist, create it
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS code_snippet (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          code TEXT NOT NULL,
          language TEXT NOT NULL,
          tags TEXT,
          is_favorite INTEGER DEFAULT 0 NOT NULL,
          user_id TEXT NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      console.log("Code_snippet table created successfully");
    }
  }
};

// Call this function to ensure the table exists
ensureCodeSnippetTable().catch((err) => {
  console.error("Error ensuring code_snippet table exists:", err);
});
