import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config();

const dialect = process.env.USE_FILE_SYSTEM_DB ? "sqlite" : "postgresql";

const url = process.env.USE_FILE_SYSTEM_DB
  ? process.env.FILEBASE_URL!
  : process.env.POSTGRES_URL!;

const schema = process.env.USE_FILE_SYSTEM_DB
  ? "./src/lib/db/sqlite/schema.sqlite.ts"
  : "./src/lib/db/pg/schema.pg.ts";

const out = process.env.USE_FILE_SYSTEM_DB
  ? "./src/lib/db/migrations/sqlite"
  : "./src/lib/db/migrations/pg";

export default defineConfig({
  schema,
  out,
  dialect,
  migrations: {},
  dbCredentials: {
    url,
  },
});
