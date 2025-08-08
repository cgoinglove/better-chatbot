ALTER TABLE "mcp_oauth_session" DROP CONSTRAINT "mcp_oauth_session_mcp_server_id_unique";--> statement-breakpoint
DROP INDEX "mcp_oauth_data_server_id_idx";--> statement-breakpoint
DROP INDEX "mcp_oauth_data_state_idx";--> statement-breakpoint
CREATE INDEX "mcp_oauth_session_server_id_idx" ON "mcp_oauth_session" USING btree ("mcp_server_id");--> statement-breakpoint
CREATE INDEX "mcp_oauth_session_state_idx" ON "mcp_oauth_session" USING btree ("state");--> statement-breakpoint
CREATE INDEX "mcp_oauth_session_tokens_idx" ON "mcp_oauth_session" USING btree ("mcp_server_id") WHERE "mcp_oauth_session"."tokens" is not null;--> statement-breakpoint
ALTER TABLE "mcp_oauth_session" ADD CONSTRAINT "mcp_oauth_session_state_unique" UNIQUE("state");