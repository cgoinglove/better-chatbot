ALTER TABLE "mcp_server" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN "visibility" varchar DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD CONSTRAINT "mcp_server_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;