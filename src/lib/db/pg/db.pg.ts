import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import "load-env";

// Create a more robust database connection
const createPool = () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL environment variable is required");
  }
  
  return new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

const pool = createPool();

export const pgDb = drizzlePg(pool);
