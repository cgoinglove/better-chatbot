CREATE TABLE IF NOT EXISTS "tool_customization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"mcp_server_name" text NOT NULL,
	"custom_prompt" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "tool_customization_user_id_tool_name_mcp_server_name_unique" UNIQUE("user_id","tool_name","mcp_server_name")
);
--> statement-breakpoint

DO $$ BEGIN
ALTER TABLE "tool_customization" ADD CONSTRAINT "tool_customization_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
