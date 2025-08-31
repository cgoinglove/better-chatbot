ALTER TABLE "mcp_server" ADD COLUMN IF NOT EXISTS "user_id" uuid;
--> statement-breakpoint
ALTER TABLE "mcp_server"
ADD COLUMN IF NOT EXISTS "visibility" varchar DEFAULT 'private' NOT NULL;
--> statement-breakpoint
ALTER TABLE "mcp_server"
ADD CONSTRAINT IF NOT EXISTS "mcp_server_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
UPDATE "mcp_server"
SET
    "visibility" = 'public'
WHERE
    "user_id" IS NULL
    AND "visibility" = 'private';
--> statement-breakpoint