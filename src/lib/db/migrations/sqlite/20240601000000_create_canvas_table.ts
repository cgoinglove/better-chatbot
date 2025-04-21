import { Migration } from "../types";

export const migration: Migration = {
  async up(db) {
    await db.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS canvas (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `,
    });
  },

  async down(db) {
    await db.execute({
      sql: `DROP TABLE IF EXISTS canvas`,
    });
  },
};
