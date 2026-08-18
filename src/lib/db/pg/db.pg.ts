import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { cache } from "react";

import * as schema from "./schema.pg";

type PgDb = ReturnType<typeof createPgDb>;
type OpenNextCloudflare = typeof import("@opennextjs/cloudflare");
type GetCloudflareContext = OpenNextCloudflare["getCloudflareContext"];

const getCloudflareContext: GetCloudflareContext | undefined =
  process.env.APP_RUNTIME === "cloudflare-workers"
    ? await import("@opennextjs/cloudflare").then(
        (mod) => mod.getCloudflareContext,
      )
    : undefined;

const createPgDb = (connectionString: string) => {
  const isCloudflareWorker = process.env.APP_RUNTIME === "cloudflare-workers";
  const pool = new Pool({
    connectionString,
    max: isCloudflareWorker ? 1 : undefined,
    maxUses: 1,
  });

  return drizzlePg({
    client: pool,
    schema,
  });
};

const resolveConnectionString = () => {
  if (process.env.APP_RUNTIME === "cloudflare-workers") {
    try {
      const { env } = getCloudflareContext!();
      const workerEnv = env as { HYPERDRIVE?: Hyperdrive };
      if (workerEnv.HYPERDRIVE?.connectionString) {
        return workerEnv.HYPERDRIVE.connectionString;
      }
    } catch {
      // Fall through to POSTGRES_URL for local Node builds and tests.
    }
  }

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "Missing POSTGRES_URL or Cloudflare HYPERDRIVE connection string",
    );
  }
  return connectionString;
};

export const getPgDb = cache(() => {
  return createPgDb(resolveConnectionString());
});

export const pgDb = new Proxy({} as PgDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getPgDb(), prop, receiver);
  },
});
