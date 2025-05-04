import { config } from "dotenv";
import logger from "logger";
import { colorize } from "consola/utils";

config();

let promise: Promise<any>;
if (process.env.USE_FILE_SYSTEM_DB) {
  promise = import("lib/db/sqlite/migrate.sqlite");
} else {
  promise = import("lib/db/pg/migrate.pg");
}

await promise
  .then(() => {
    logger.info("🚀 DB Migration completed");
  })
  .catch((err) => {
    logger.error(err);

    logger.warn(
      `
      ${colorize("red", "🚨 Migration failed due to incompatible schema.")}
      
❗️DB Migration failed – incompatible schema detected.

This version introduces a complete rework of the database schema.
As a result, your existing database structure may no longer be compatible.

**To resolve this:**

1. Drop all existing tables in your database.
2. Then run the following command to apply the latest schema:


${colorize("green", "pnpm db:migrate")}

**Note:** This schema overhaul lays the foundation for more stable updates moving forward.
You shouldn’t have to do this kind of reset again in future releases.

Need help? Open an issue on GitHub 🙏
      `.trim(),
    );

    process.exit(1);
  });
