import { sql } from "drizzle-orm";
import { pgDb } from "./db.pg";
import { sqliteDb } from "./db.sqlite";
import {
  DocumentEmbeddingPgSchema,
  DocumentEmbeddingSqliteSchema,
  DocumentPgSchema,
  DocumentSqliteSchema,
} from "./schema.vector";

// Function to ensure the vector database tables exist
export const ensureVectorTables = async () => {
  if (process.env.USE_FILE_SYSTEM_DB === "true") {
    try {
      // Check if the document table exists by trying to query it
      await sqliteDb.select().from(DocumentSqliteSchema).limit(1);
      await sqliteDb.select().from(DocumentEmbeddingSqliteSchema).limit(1);
    } catch (error) {
      console.log("Creating vector database tables as they don't exist...");

      // Create document table
      await sqliteDb.run(sql`
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
      `);

      // Create document_embedding table
      await sqliteDb.run(sql`
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
      `);

      // Create indexes
      await sqliteDb.run(
        sql`CREATE INDEX IF NOT EXISTS document_library_id_idx ON document (library_id)`,
      );
      await sqliteDb.run(
        sql`CREATE INDEX IF NOT EXISTS document_user_id_idx ON document (user_id)`,
      );
      await sqliteDb.run(
        sql`CREATE INDEX IF NOT EXISTS document_embedding_document_id_idx ON document_embedding (document_id)`,
      );
      await sqliteDb.run(
        sql`CREATE INDEX IF NOT EXISTS document_embedding_library_id_idx ON document_embedding (library_id)`,
      );

      console.log("Vector database tables created successfully");
    }
  } else {
    // For PostgreSQL, we rely on migrations
    try {
      // Check if the tables exist
      await pgDb.select().from(DocumentPgSchema).limit(1);
      await pgDb.select().from(DocumentEmbeddingPgSchema).limit(1);
    } catch (error) {
      console.log("PostgreSQL vector tables not found. Please run migrations.");
    }
  }
};

// Don't automatically call the function to avoid initialization issues
// ensureVectorTables().catch(error => {
//   console.error("Error initializing vector database tables:", error);
// });
