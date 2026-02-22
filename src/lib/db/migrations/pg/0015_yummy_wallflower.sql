ALTER TABLE "mcp_server" ADD COLUMN IF NOT EXISTS "tool_info" json;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN IF NOT EXISTS "tool_info_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN IF NOT EXISTS "last_connection_status" varchar;