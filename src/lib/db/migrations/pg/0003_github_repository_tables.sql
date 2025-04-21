CREATE TABLE IF NOT EXISTS "github_repository" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "path" text NOT NULL,
  "description" text,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "last_indexed" timestamp,
  "user_id" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "github_file_index" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "repository_id" uuid NOT NULL,
  "file_path" text NOT NULL,
  "content" text,
  "language" text,
  "last_indexed" timestamp NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "github_file_index_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "github_repository"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "github_repository_user_id_idx" ON "github_repository" ("user_id");
CREATE INDEX IF NOT EXISTS "github_file_index_repository_id_idx" ON "github_file_index" ("repository_id");
CREATE INDEX IF NOT EXISTS "github_file_index_file_path_idx" ON "github_file_index" ("file_path");
