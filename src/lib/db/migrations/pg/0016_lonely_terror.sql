CREATE TABLE "url_rewrite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"target_kind" varchar(32) DEFAULT 'chat' NOT NULL,
	"payload" json NOT NULL,
	"payload_version" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "url_rewrite_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "url_rewrite" ADD CONSTRAINT "url_rewrite_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "url_rewrite_created_at_idx" ON "url_rewrite" USING btree ("created_at");