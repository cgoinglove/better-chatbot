import { IS_VERCEL_ENV } from "lib/const";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Enable proxy support for undici (used by AI SDK) via HTTP_PROXY/HTTPS_PROXY env vars
    const proxyUrl =
      process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy;
    if (proxyUrl) {
      const { ProxyAgent, setGlobalDispatcher } = await import("undici");
      console.log(`[proxy] Using proxy for fetch requests: ${proxyUrl}`);
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
    }
    if (!IS_VERCEL_ENV) {
      // run DB migration
      const runMigrate = await import("./lib/db/pg/migrate.pg").then(
        (m) => m.runMigrate,
      );
      await runMigrate().catch((e) => {
        console.error(e);
        process.exit(1);
      });
      const initMCPManager = await import("./lib/ai/mcp/mcp-manager").then(
        (m) => m.initMCPManager,
      );
      await initMCPManager();
    }
  }
}
