CREATE TABLE IF NOT EXISTS "agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" json,
	"user_id" uuid NOT NULL,
	"instructions" json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "agent" ADD CONSTRAINT "agent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Migrate data from project to agent if project table exists
DO $$ 
BEGIN
	IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project') THEN
		-- Migrate existing project data to agent table
		INSERT INTO "agent" (id, name, user_id, instructions, created_at, updated_at)
		SELECT id, name, user_id, instructions, created_at, updated_at 
		FROM "project"
		ON CONFLICT (id) DO NOTHING;
		
		-- Drop project table after migration
		DROP TABLE "project" CASCADE;
	END IF;
END $$;
--> statement-breakpoint

-- Remove project_id column from chat_thread if it exists
DO $$ 
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns 
			  WHERE table_name = 'chat_thread' AND column_name = 'project_id') THEN
		ALTER TABLE "chat_thread" DROP COLUMN "project_id";
	END IF;
END $$;