import { runMigrate } from "./pg/migrate.pg";
import { IS_VERCEL_ENV } from "lib/const";

let migrationPromise: Promise<void> | null = null;

export const ensureMigrations = async () => {
  // Only run migrations on Vercel at runtime
  if (!IS_VERCEL_ENV) {
    return;
  }

  // If migration is already running, wait for it
  if (migrationPromise) {
    return migrationPromise;
  }

  // Start migration
  migrationPromise = runMigrate()
    .then(() => {
      console.log("✅ Runtime database migration completed");
    })
    .catch((error) => {
      console.error("❌ Runtime database migration failed:", error);
      // Reset the promise so it can be retried
      migrationPromise = null;
      throw error;
    });

  return migrationPromise;
};