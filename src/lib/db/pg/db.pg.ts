import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";

export const pgDb = drizzlePg(process.env.POSTGRES_URL!);
