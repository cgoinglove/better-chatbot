import { sql } from "drizzle-orm";
import { sqliteDb } from "./db.sqlite";
import { CanvasSqliteSchema } from "./schema.canvas";

// Function to ensure the canvas table exists
export const ensureCanvasTable = async () => {
  if (process.env.USE_FILE_SYSTEM_DB === "true") {
    try {
      // Check if the canvas table exists by trying to query it
      await sqliteDb.select().from(CanvasSqliteSchema).limit(1);
    } catch (error) {
      console.log("Creating canvas table as it doesn't exist...");
      // If the table doesn't exist, create it
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS canvas (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      console.log("Canvas table created successfully");
    }
  }
};

// Call this function to ensure the table exists
ensureCanvasTable().catch((err) => {
  console.error("Error ensuring canvas table exists:", err);
});
