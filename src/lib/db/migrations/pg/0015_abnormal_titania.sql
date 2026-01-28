DROP INDEX "mcp_oauth_session_tokens_idx";--> statement-breakpoint
ALTER TABLE "mcp_oauth_session" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN "per_user_auth" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN "tool_info" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "mcp_oauth_session" ADD CONSTRAINT "mcp_oauth_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_oauth_session_user_id_idx" ON "mcp_oauth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mcp_oauth_session_tokens_idx" ON "mcp_oauth_session" USING btree ("mcp_server_id","user_id") WHERE "mcp_oauth_session"."tokens" is not null;