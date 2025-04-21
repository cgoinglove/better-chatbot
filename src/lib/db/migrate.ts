import { migrate } from "drizzle-orm/libsql/migrator";
import { sqliteDb } from "./db.sqlite";
import { pgDb } from "./db.pg";
import { migrate as pgMigrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";

export async function runMigrations() {
  const isUsingSqlite = process.env.USE_FILE_SYSTEM_DB === "true";
  
  if (isUsingSqlite) {
    console.log("Running SQLite migrations...");
    await migrate(sqliteDb, {
      migrationsFolder: path.resolve(process.cwd(), "src/lib/db/migrations/sqlite"),
    });
    console.log("SQLite migrations completed successfully!");
  } else {
    console.log("Running PostgreSQL migrations...");
    await pgMigrate(pgDb, {
      migrationsFolder: path.resolve(process.cwd(), "src/lib/db/migrations/pg"),
    });
    console.log("PostgreSQL migrations completed successfully!");
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("All migrations completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
