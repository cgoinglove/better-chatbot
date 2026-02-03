CREATE TABLE "workflow_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"workflow_node_id" uuid NOT NULL,
	"cron" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"payload" json DEFAULT '{}'::json,
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"last_error" text,
	"locked_at" timestamp,
	"locked_by" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "workflow_schedule_node_unique" UNIQUE("workflow_node_id")
);
--> statement-breakpoint
ALTER TABLE "workflow_schedule" ADD CONSTRAINT "workflow_schedule_workflow_id_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_schedule" ADD CONSTRAINT "workflow_schedule_workflow_node_id_workflow_node_id_fk" FOREIGN KEY ("workflow_node_id") REFERENCES "public"."workflow_node"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_schedule_workflow_idx" ON "workflow_schedule" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_schedule_next_run_idx" ON "workflow_schedule" USING btree ("next_run_at");