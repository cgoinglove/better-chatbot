import { Migration } from "../types";

export const migration: Migration = {
  async up(db) {
    await db.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS file (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          path TEXT NOT NULL,
          mimetype TEXT NOT NULL,
          size INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          metadata TEXT,
          created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `,
    });

    await db.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS file_attachment (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          mimetype TEXT NOT NULL,
          url TEXT NOT NULL,
          thumbnail_url TEXT,
          created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (file_id) REFERENCES file(id) ON DELETE CASCADE,
          FOREIGN KEY (message_id) REFERENCES chat_message(id) ON DELETE CASCADE
        )
      `,
    });
  },

  async down(db) {
    await db.execute({
      sql: `DROP TABLE IF EXISTS file_attachment`,
    });
    await db.execute({
      sql: `DROP TABLE IF EXISTS file`,
    });
  },
};
