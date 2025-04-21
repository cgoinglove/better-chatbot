import { sql } from "drizzle-orm";
import { sqliteDb } from "./db.sqlite";
import { pgGithubService } from "./queries.pg/github";
import { sqliteGithubService } from "./queries.sqlite/github";
import { GitHubRepositorySqliteSchema, GitHubFileIndexSqliteSchema } from "./schema.github";

// Function to ensure the GitHub repository tables exist
export const ensureGithubTables = async () => {
  if (process.env.USE_FILE_SYSTEM_DB === "true") {
    try {
      // Check if the github_repository table exists by trying to query it
      await sqliteDb.select().from(GitHubRepositorySqliteSchema).limit(1);
    } catch (error) {
      console.log("Creating github_repository table as it doesn't exist...");
      // If the table doesn't exist, create it
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS github_repository (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          description TEXT,
          is_enabled INTEGER DEFAULT 1 NOT NULL,
          last_indexed INTEGER,
          user_id TEXT NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
      console.log("github_repository table created successfully");
    }

    try {
      // Check if the github_file_index table exists by trying to query it
      await sqliteDb.select().from(GitHubFileIndexSqliteSchema).limit(1);
    } catch (error) {
      console.log("Creating github_file_index table as it doesn't exist...");
      // If the table doesn't exist, create it
      await sqliteDb.run(sql`
        CREATE TABLE IF NOT EXISTS github_file_index (
          id TEXT PRIMARY KEY NOT NULL,
          repository_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          content TEXT,
          language TEXT,
          last_indexed INTEGER NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          FOREIGN KEY (repository_id) REFERENCES github_repository(id) ON DELETE CASCADE
        )
      `);
      console.log("github_file_index table created successfully");

      // Create indexes
      await sqliteDb.run(sql`CREATE INDEX IF NOT EXISTS github_repository_user_id_idx ON github_repository (user_id)`);
      await sqliteDb.run(sql`CREATE INDEX IF NOT EXISTS github_file_index_repository_id_idx ON github_file_index (repository_id)`);
      await sqliteDb.run(sql`CREATE INDEX IF NOT EXISTS github_file_index_file_path_idx ON github_file_index (file_path)`);
    }
  }
};

// Call this function to ensure the tables exist
ensureGithubTables().catch((err) => {
  console.error("Error ensuring GitHub tables exist:", err);
});

export const githubService = process.env.USE_FILE_SYSTEM_DB
  ? sqliteGithubService
  : pgGithubService;
