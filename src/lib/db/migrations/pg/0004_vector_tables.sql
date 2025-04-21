-- Create document table
CREATE TABLE IF NOT EXISTS "document" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "library_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "file_path" text,
  "mime_type" text,
  "size" integer,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create document_embedding table
CREATE TABLE IF NOT EXISTS "document_embedding" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "document_id" uuid NOT NULL,
  "library_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "embedding" jsonb NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "document_library_id_idx" ON "document" ("library_id");
CREATE INDEX IF NOT EXISTS "document_user_id_idx" ON "document" ("user_id");
CREATE INDEX IF NOT EXISTS "document_embedding_document_id_idx" ON "document_embedding" ("document_id");
CREATE INDEX IF NOT EXISTS "document_embedding_library_id_idx" ON "document_embedding" ("library_id");
