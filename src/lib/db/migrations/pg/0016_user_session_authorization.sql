-- User Session Authorization Management Migration
-- Adds userId to mcp_oauth_session table for user session isolation
-- Adds user_session_auth flag to mcp_server table for enabling per-user authorization

-- Drop the old tokens index (we'll recreate it with userId)
DROP INDEX IF EXISTS "mcp_oauth_session_tokens_idx";

--> statement-breakpoint
-- Add user_id column to mcp_oauth_session table for user session authorization
ALTER TABLE "mcp_oauth_session" ADD COLUMN IF NOT EXISTS "user_id" uuid;

--> statement-breakpoint
-- Add user_session_auth column to mcp_server table
-- When enabled, each user maintains their own authorization session with this MCP server
ALTER TABLE "mcp_server" ADD COLUMN IF NOT EXISTS "user_session_auth" boolean NOT NULL DEFAULT false;

--> statement-breakpoint
-- Add tool_info column to mcp_server table (for caching tool info)
ALTER TABLE "mcp_server" ADD COLUMN IF NOT EXISTS "tool_info" json DEFAULT '[]'::json;

--> statement-breakpoint
-- Add foreign key constraint for user_id
DO $$ BEGIN
ALTER TABLE "mcp_oauth_session" ADD CONSTRAINT "mcp_oauth_session_user_id_user_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Create index on user_id for faster user session lookups
CREATE INDEX IF NOT EXISTS "mcp_oauth_session_user_id_idx" ON "mcp_oauth_session" USING btree ("user_id");

--> statement-breakpoint
-- Recreate tokens index with user_id for user session authorization lookups
CREATE INDEX IF NOT EXISTS "mcp_oauth_session_tokens_idx" ON "mcp_oauth_session" 
  USING btree ("mcp_server_id", "user_id") 
  WHERE "mcp_oauth_session"."tokens" is not null;

