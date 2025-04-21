import { sql } from "drizzle-orm";
import { sqliteDb } from "./db.sqlite";
import { pgRulesService } from "./queries.pg/rules";
import { sqliteRulesService } from "./queries.sqlite/rules";
import { RulesSqliteSchema } from "./schema.rules";

// Function to ensure the rules table exists
export const ensureRulesTable = async () => {
  if (process.env.USE_FILE_SYSTEM_DB === "true") {
    try {
      // Check if the rules table exists by trying to query it
      await sqliteDb.select().from(RulesSqliteSchema).limit(1);
    } catch (error) {
      console.log("Creating rules table as it doesn't exist...");
      // If the table doesn't exist, create it
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS rules (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          is_enabled INTEGER DEFAULT 1 NOT NULL,
          priority INTEGER DEFAULT 0 NOT NULL,
          user_id TEXT NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      console.log("Rules table created successfully");
    }
  }
};

// Call this function to ensure the table exists
ensureRulesTable().catch((err) => {
  console.error("Error ensuring rules table exists:", err);
});

export const rulesService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteRulesService
  : pgRulesService;
