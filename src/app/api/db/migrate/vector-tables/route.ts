import { migrate } from "drizzle-orm/libsql/migrator";
import { pgMigrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";
import { pgDb } from "lib/db/db.pg";
import { sqliteDb } from "lib/db/db.sqlite";
import { ensureVectorTables } from "lib/db/vector-service-init";

export async function GET() {
  try {
    const isUsingSqlite = process.env.USE_FILE_SYSTEM_DB === "true";
    
    if (isUsingSqlite) {
      console.log("Running SQLite vector tables migration...");
      await migrate(sqliteDb, {
        migrationsFolder: path.resolve(process.cwd(), "src/lib/db/migrations/sqlite"),
      });
      
      // Ensure vector tables exist
      await ensureVectorTables();
      
      console.log("SQLite vector tables migration completed successfully!");
    } else {
      console.log("Running PostgreSQL vector tables migration...");
      await pgMigrate(pgDb, {
        migrationsFolder: path.resolve(process.cwd(), "src/lib/db/migrations/pg"),
      });
      console.log("PostgreSQL vector tables migration completed successfully!");
    }
    
    return new Response("Vector tables migration completed successfully", { status: 200 });
  } catch (error) {
    console.error("Error running vector tables migration:", error);
    return new Response(`Error running vector tables migration: ${error.message}`, { status: 500 });
  }
}
