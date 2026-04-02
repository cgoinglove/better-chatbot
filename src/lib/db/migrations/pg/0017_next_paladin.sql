CREATE TABLE "plugin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" varchar DEFAULT 'custom' NOT NULL,
	"icon" text DEFAULT 'Sparkles' NOT NULL,
	"color" text DEFAULT 'bg-blue-500/10 text-blue-500' NOT NULL,
	"system_prompt_addition" text DEFAULT '' NOT NULL,
	"skills" json DEFAULT '[]'::json NOT NULL,
	"commands" json DEFAULT '[]'::json NOT NULL,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_plugin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plugin_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"custom_system_prompt" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_plugin_user_id_plugin_id_unique" UNIQUE("user_id","plugin_id")
);
--> statement-breakpoint
ALTER TABLE "plugin" ADD CONSTRAINT "plugin_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plugin" ADD CONSTRAINT "user_plugin_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plugin" ADD CONSTRAINT "user_plugin_plugin_id_plugin_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plugin_tenant_id_idx" ON "plugin" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "plugin_user_id_idx" ON "plugin" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_plugin_user_id_idx" ON "user_plugin" USING btree ("user_id");