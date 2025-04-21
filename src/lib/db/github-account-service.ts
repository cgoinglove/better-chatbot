import { sql } from "drizzle-orm";
import { sqliteDb } from "./db.sqlite";
import { pgGithubAccountService } from "./queries.pg/github-account";
import { sqliteGithubAccountService } from "./queries.sqlite/github-account";
import { GitHubAccountSqliteSchema } from "./schema.github-account";

// Function to ensure the GitHub account table exists
export const ensureGithubAccountTable = async () => {
  if (process.env.USE_FILE_SYSTEM_DB === "true") {
    try {
      // Check if the github_account table exists by trying to query it
      await sqliteDb.select().from(GitHubAccountSqliteSchema).limit(1);
    } catch (error) {
      console.log("Creating github_account table as it doesn't exist...");
      // If the table doesn't exist, create it
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS github_account (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          github_id TEXT NOT NULL,
          username TEXT NOT NULL,
          name TEXT,
          email TEXT,
          avatar_url TEXT,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_type TEXT NOT NULL,
          scope TEXT NOT NULL,
          is_active INTEGER DEFAULT 1 NOT NULL,
          expires_at INTEGER,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      console.log("github_account table created successfully");

      // Create indexes
      await sqliteDb.run(sql`CREATE INDEX IF NOT EXISTS github_account_user_id_idx ON github_account (user_id)`);
      await sqliteDb.run(sql`CREATE INDEX IF NOT EXISTS github_account_github_id_idx ON github_account (github_id)`);
      await sqliteDb.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS github_account_user_id_github_id_unique ON github_account (user_id, github_id)`);
    }
  }
};

// Call this function to ensure the table exists
ensureGithubAccountTable().catch((err) => {
  console.error("Error ensuring GitHub account table exists:", err);
});

export const githubAccountService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteGithubAccountService
  : pgGithubAccountService;
