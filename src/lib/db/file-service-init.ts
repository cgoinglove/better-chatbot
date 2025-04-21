import { sql } from "drizzle-orm";
import { sqliteDb } from "./db.sqlite";
import { FileAttachmentSqliteSchema, FileSqliteSchema } from "./schema.file";

// Function to ensure the file tables exist
export const ensureFileTables = async () => {
  if (process.env.USE_FILE_SYSTEM_DB === "true") {
    try {
      // Check if the file table exists by trying to query it
      await sqliteDb.select().from(FileSqliteSchema).limit(1);
    } catch (error) {
      console.log("Creating file table as it doesn't exist...");
      // If the table doesn't exist, create it
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS file (
          id TEXT PRIMARY KEY NOT NULL,
          filename TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          path TEXT NOT NULL,
          mimetype TEXT NOT NULL,
          size INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          metadata TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      console.log("File table created successfully");
    }

    try {
      // Check if the file_attachment table exists
      await sqliteDb.select().from(FileAttachmentSqliteSchema).limit(1);
    } catch (error) {
      console.log("Creating file_attachment table as it doesn't exist...");
      // If the table doesn't exist, create it
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS file_attachment (
          id TEXT PRIMARY KEY NOT NULL,
          file_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          mimetype TEXT NOT NULL,
          url TEXT NOT NULL,
          thumbnail_url TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          FOREIGN KEY (file_id) REFERENCES file (id) ON DELETE CASCADE,
          FOREIGN KEY (message_id) REFERENCES chat_message (id) ON DELETE CASCADE
        )
      `);
      console.log("File_attachment table created successfully");
    }
  }
};

// Call this function to ensure the tables exist
ensureFileTables().catch((err) => {
  console.error("Error ensuring file tables exist:", err);
});
