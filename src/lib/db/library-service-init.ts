import { sql } from "drizzle-orm";
import { sqliteDb } from "./db.sqlite";
import { LibraryEntrySqliteSchema, LibrarySqliteSchema } from "./schema.library";

// Function to ensure the library tables exist
export const ensureLibraryTables = async () => {
  if (process.env.USE_FILE_SYSTEM_DB === "true") {
    try {
      // Check if the library table exists by trying to query it
      await sqliteDb.select().from(LibrarySqliteSchema).limit(1);
      await sqliteDb.select().from(LibraryEntrySqliteSchema).limit(1);
    } catch (error) {
      console.log("Creating library tables as they don't exist...");
      
      // Create library table
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS library (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          user_id TEXT NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      
      // Create library_entry table
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS library_entry (
          id TEXT PRIMARY KEY NOT NULL,
          library_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          source TEXT,
          source_type TEXT,
          tags TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      
      // Create indexes
      await sqliteDb.run(sql`CREATE INDEX IF NOT EXISTS library_user_id_idx ON library (user_id)`);
      await sqliteDb.run(sql`CREATE INDEX IF NOT EXISTS library_entry_library_id_idx ON library_entry (library_id)`);
      
      console.log("Library tables created successfully");
    }
  }
};
