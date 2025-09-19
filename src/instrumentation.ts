import { IS_VERCEL_ENV } from "lib/const";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // run DB migration
    const runMigrate = await import("./lib/db/pg/migrate.pg").then(
      (m) => m.runMigrate,
    );
    await runMigrate().catch((e) => {
      console.error("Database migration failed:", e.message);
      // Don't exit on Vercel, just log the error
      if (!IS_VERCEL_ENV) {
        process.exit(1);
      }
    });
    
    if (!IS_VERCEL_ENV) {
      const initMCPManager = await import("./lib/ai/mcp/mcp-manager").then(
        (m) => m.initMCPManager,
      );
      await initMCPManager();
    }
  }
}
