import { Migration } from "../types";

export const migration: Migration = {
  async up(db) {
    // Create document table
    await db.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS document (
          id TEXT PRIMARY KEY NOT NULL,
          library_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          file_path TEXT,
          mime_type TEXT,
          size INTEGER,
          metadata TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `,
    });

    // Create document_embedding table
    await db.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS document_embedding (
          id TEXT PRIMARY KEY NOT NULL,
          document_id TEXT NOT NULL,
          library_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          embedding TEXT NOT NULL,
          metadata TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `,
    });

    // Create indexes
    await db.execute({
      sql: `CREATE INDEX IF NOT EXISTS document_library_id_idx ON document (library_id)`,
    });

    await db.execute({
      sql: `CREATE INDEX IF NOT EXISTS document_user_id_idx ON document (user_id)`,
    });

    await db.execute({
      sql: `CREATE INDEX IF NOT EXISTS document_embedding_document_id_idx ON document_embedding (document_id)`,
    });

    await db.execute({
      sql: `CREATE INDEX IF NOT EXISTS document_embedding_library_id_idx ON document_embedding (library_id)`,
    });
  },

  async down(db) {
    await db.execute({
      sql: `DROP TABLE IF EXISTS document_embedding`,
    });

    await db.execute({
      sql: `DROP TABLE IF EXISTS document`,
    });
  },
};
