import { NextResponse } from "next/server";
import { sqliteDb } from "lib/db/db.sqlite";
import { pgDb } from "lib/db/db.pg";
import { migrate } from "drizzle-orm/libsql/migrator";
import { migrate as pgMigrate } from "drizzle-orm/pg/migrator";
import path from "path";
import { ensureUploadsDir } from "lib/db/file-service";

export async function GET() {
  try {
    const isUsingSqlite = process.env.USE_FILE_SYSTEM_DB === "true";
    
    // Ensure uploads directory exists
    await ensureUploadsDir();
    
    if (isUsingSqlite) {
      console.log("Running SQLite file tables migration...");
      await migrate(sqliteDb, {
        migrationsFolder: path.resolve(process.cwd(), "src/lib/db/migrations/sqlite"),
      });
      console.log("SQLite file tables migration completed successfully!");
    } else {
      console.log("Running PostgreSQL file tables migration...");
      await pgMigrate(pgDb, {
        migrationsFolder: path.resolve(process.cwd(), "src/lib/db/migrations/pg"),
      });
      console.log("PostgreSQL file tables migration completed successfully!");
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${isUsingSqlite ? "SQLite" : "PostgreSQL"} file tables migration completed successfully!` 
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "An error occurred during migration" 
    }, { status: 500 });
  }
}
