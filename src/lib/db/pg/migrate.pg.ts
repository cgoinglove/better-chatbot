import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { join } from "path";
import { Pool } from "pg";

config();

const runMigrate = async () => {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL!,
  });
  const pgDb = drizzle(pool);

  console.log("⏳ Running PostgreSQL migrations...");

  const start = Date.now();
  await migrate(pgDb, {
    migrationsFolder: join(process.cwd(), "src/lib/db/migrations/pg"),
  });
  const end = Date.now();

  console.log("✅ PostgreSQL migrations completed in", end - start, "ms");
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ PostgreSQL migration failed");
  console.error(err);
  process.exit(1);
});
