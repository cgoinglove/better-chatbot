import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { join } from "path";

config();

/**
 * @deprecated
 */
const runMigrate = async () => {
  const sqliteDb = drizzle({
    client: createClient({ url: process.env.FILEBASE_URL! }),
  });

  console.log("⏳ Running migrations...");

  const start = Date.now();
  await migrate(sqliteDb, {
    migrationsFolder: join(process.cwd(), "src/lib/db/migrations/sqlite"),
  });
  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
