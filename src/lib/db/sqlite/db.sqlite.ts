import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
/**
 * @deprecated
 */
export const sqliteDb = drizzle({
  client: createClient({ url: process.env.FILEBASE_URL! }),
});
