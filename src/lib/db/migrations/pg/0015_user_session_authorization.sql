-- User Session Authorization Migration
-- Adds per-user MCP server authentication support

-- Add authentication columns to mcp_server table
ALTER TABLE "mcp_server" ADD COLUMN IF NOT EXISTS "requires_auth" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN IF NOT EXISTS "auth_provider" varchar(20) NOT NULL DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN IF NOT EXISTS "auth_config" json;

--> statement-breakpoint
-- Create user_session_authorization table for per-user MCP OAuth sessions
CREATE TABLE IF NOT EXISTS "user_session_authorization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mcp_server_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"token_type" text DEFAULT 'Bearer',
	"expires_at" timestamp,
	"scope" text,
	"state" text,
	"code_verifier" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_session_authorization_state_unique" UNIQUE("state"),
	CONSTRAINT "mcp_user_oauth_unique" UNIQUE("user_id","mcp_server_id")
);

--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "user_session_authorization" ADD CONSTRAINT "user_session_authorization_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "user_session_authorization" ADD CONSTRAINT "user_session_authorization_mcp_server_id_mcp_server_id_fk" FOREIGN KEY ("mcp_server_id") REFERENCES "public"."mcp_server"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_user_oauth_user_idx" ON "user_session_authorization" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_user_oauth_server_idx" ON "user_session_authorization" USING btree ("mcp_server_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_user_oauth_state_idx" ON "user_session_authorization" USING btree ("state");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_user_oauth_tokens_idx" ON "user_session_authorization" USING btree ("user_id","mcp_server_id") WHERE "access_token" IS NOT NULL;


