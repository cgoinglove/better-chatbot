CREATE TABLE IF NOT EXISTS "agent_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" varchar DEFAULT 'bug' NOT NULL,
	"status" varchar DEFAULT 'new' NOT NULL,
	"user_email" text,
	"user_name" text,
	"page_url" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_file_agent_id_agent_id_fk') THEN
    ALTER TABLE "agent_file" ADD CONSTRAINT "agent_file_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_file_user_id_user_id_fk') THEN
    ALTER TABLE "agent_file" ADD CONSTRAINT "agent_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'issue_report_user_id_user_id_fk') THEN
    ALTER TABLE "issue_report" ADD CONSTRAINT "issue_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_file_agent_id_idx" ON "agent_file" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_report_user_id_idx" ON "issue_report" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_report_status_idx" ON "issue_report" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_thread_project_id_idx" ON "chat_thread" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_file_project_id_idx" ON "project_file" USING btree ("project_id");