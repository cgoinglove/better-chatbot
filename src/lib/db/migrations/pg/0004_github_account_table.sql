CREATE TABLE IF NOT EXISTS "github_account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "github_id" text NOT NULL,
  "username" text NOT NULL,
  "name" text,
  "email" text,
  "avatar_url" text,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "token_type" text NOT NULL,
  "scope" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "github_account_user_id_idx" ON "github_account" ("user_id");
CREATE INDEX IF NOT EXISTS "github_account_github_id_idx" ON "github_account" ("github_id");
CREATE UNIQUE INDEX IF NOT EXISTS "github_account_user_id_github_id_unique" ON "github_account" ("user_id", "github_id");
