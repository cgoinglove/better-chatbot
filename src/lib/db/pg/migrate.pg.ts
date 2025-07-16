import { migrate } from "drizzle-orm/node-postgres/migrator";
import { join } from "path";
import { pgDb } from "lib/db/pg/db.pg";

export const runMigrate = async () => {
  console.log("⏳ Running PostgreSQL migrations...");

  const start = Date.now();
  await migrate(pgDb, {
    migrationsFolder: join(process.cwd(), "src/lib/db/migrations/pg"),
  }).catch((err) => {
    console.error(
      `❌ PostgreSQL migrations failed. check the postgres instance is running.`,
      err.cause,
    );
    throw err;
  });
  const end = Date.now();

  console.log("✅ PostgreSQL migrations completed in", end - start, "ms");
};
