import { sqliteDb } from "./db.sqlite";
import { pgDb } from "./db.pg";

// Determine if we're using PostgreSQL based on environment variable
export const isDatabasePg = process.env.USE_FILE_SYSTEM_DB !== "true";

// Export the database instances
export { sqliteDb, pgDb };
