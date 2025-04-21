import { migrate } from "drizzle-orm/libsql/migrator";
import { sqliteDb } from "lib/db/db.sqlite";
import { pgDb } from "lib/db/db.pg";
import { migrate as pgMigrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
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
    
    return NextResponse.json({ success: true, message: "Migrations completed successfully" });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}
