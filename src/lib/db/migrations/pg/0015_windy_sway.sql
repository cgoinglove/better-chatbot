CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"ip_address" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category" varchar NOT NULL,
	"conditions" json DEFAULT '[]'::json NOT NULL,
	"severity" varchar DEFAULT 'medium' NOT NULL,
	"notify_channels" json DEFAULT '[]'::json NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid,
	"lead_id" uuid,
	"category" varchar NOT NULL,
	"severity" varchar NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"source_url" text,
	"source_type" varchar(100),
	"action_items" json DEFAULT '[]'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" varchar(20) NOT NULL,
	"scopes" json DEFAULT '[]'::json NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "api_key_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "billing_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clerk_subscription_id" text NOT NULL,
	"plan" varchar NOT NULL,
	"status" varchar NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "billing_subscription_clerk_subscription_id_unique" UNIQUE("clerk_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "buying_signal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"signal_type" varchar NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"composite_score" integer DEFAULT 50 NOT NULL,
	"component_signals" json DEFAULT '[]'::json NOT NULL,
	"recommended_action" text NOT NULL,
	"optimal_timing" text,
	"expires_at" timestamp,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"detected_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"legal_name" varchar(500),
	"website" text,
	"industry" varchar(200),
	"sub_industry" varchar(200),
	"naics_code" varchar(10),
	"sic_code" varchar(10),
	"description" text,
	"headquarters" json,
	"annual_revenue" numeric,
	"employee_count" integer,
	"founded_year" integer,
	"stock_ticker" varchar(10),
	"linkedin_url" text,
	"sales_methodology" text,
	"value_proposition" text,
	"target_markets" json DEFAULT '[]'::json NOT NULL,
	"competitors" json DEFAULT '[]'::json NOT NULL,
	"key_differentiators" json DEFAULT '[]'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"is_client_company" boolean DEFAULT false NOT NULL,
	"enriched_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_burden" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"facility_count" integer DEFAULT 1 NOT NULL,
	"regulatory_programs" json DEFAULT '[]'::json NOT NULL,
	"estimated_annual_cost" numeric NOT NULL,
	"cost_breakdown" json DEFAULT '[]'::json NOT NULL,
	"risk_level" varchar DEFAULT 'medium' NOT NULL,
	"savings_opportunity" numeric DEFAULT '0' NOT NULL,
	"roi_projection" json DEFAULT '{}'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"calculated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configurable_agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vertical" varchar(100) NOT NULL,
	"agent_type" varchar(100) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_prompt" text NOT NULL,
	"tools" json DEFAULT '[]'::json NOT NULL,
	"guardrails" json DEFAULT '[]'::json NOT NULL,
	"model" text,
	"temperature" numeric,
	"max_tokens" integer,
	"config" json DEFAULT '{}'::json NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar NOT NULL,
	"name" text NOT NULL,
	"config" json DEFAULT '{}'::json NOT NULL,
	"status" varchar DEFAULT 'disconnected' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_id" uuid NOT NULL,
	"status" varchar NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"records_failed" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "contact_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"activity_type" varchar NOT NULL,
	"subject" varchar(500),
	"notes" text,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_enrichment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_type" varchar NOT NULL,
	"source_id" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"enriched_data" json DEFAULT '{}'::json NOT NULL,
	"confidence_score" integer DEFAULT 50 NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid,
	"lead_id" uuid,
	"first_name" varchar(200) NOT NULL,
	"last_name" varchar(200) NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone" varchar(50),
	"mobile_phone" varchar(50),
	"title" varchar(500),
	"department" varchar(200),
	"company" varchar(500),
	"company_id" uuid,
	"linkedin_url" text,
	"role" varchar DEFAULT 'unknown' NOT NULL,
	"seniority" varchar(50),
	"status" varchar DEFAULT 'identified' NOT NULL,
	"location" json,
	"confidence_score" integer DEFAULT 50 NOT NULL,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"enriched_at" timestamp,
	"last_contacted_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"company_id" uuid,
	"health_score" integer DEFAULT 50 NOT NULL,
	"health_status" varchar DEFAULT 'healthy' NOT NULL,
	"engagement_score" integer DEFAULT 50 NOT NULL,
	"adoption_score" integer DEFAULT 50 NOT NULL,
	"sentiment_score" integer DEFAULT 50 NOT NULL,
	"expansion_probability" numeric DEFAULT '0' NOT NULL,
	"churn_risk" numeric DEFAULT '0' NOT NULL,
	"factors" json DEFAULT '[]'::json NOT NULL,
	"expansion_opportunities" json DEFAULT '[]'::json NOT NULL,
	"last_assessed_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"prospect_id" uuid,
	"outcome" varchar NOT NULL,
	"deal_value" numeric DEFAULT '0' NOT NULL,
	"sales_cycle_length" integer DEFAULT 0 NOT NULL,
	"competitor_involved" varchar(300),
	"win_loss_reasons" json DEFAULT '[]'::json NOT NULL,
	"stage_progression" json DEFAULT '[]'::json NOT NULL,
	"key_factors" json DEFAULT '[]'::json NOT NULL,
	"lessons_learned" json DEFAULT '[]'::json NOT NULL,
	"recommendations" json DEFAULT '[]'::json NOT NULL,
	"analyzed_by" uuid,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"analyzed_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filing_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"prospect_id" uuid,
	"external_id" text NOT NULL,
	"filing_type" varchar(200) NOT NULL,
	"title" varchar(1000) NOT NULL,
	"description" text,
	"filing_date" date NOT NULL,
	"filing_url" text,
	"facility_name" varchar(500),
	"facility_id" varchar(200),
	"state" varchar(2),
	"county" varchar(200),
	"regulatory_program" varchar(200),
	"company_name" varchar(500),
	"contact_name" varchar(200),
	"contact_title" varchar(200),
	"contact_email" text,
	"contact_phone" varchar(50),
	"raw_data" json DEFAULT '{}'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industry_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"industry_id" uuid NOT NULL,
	"tenant_id" uuid,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"doc_type" varchar NOT NULL,
	"source_url" text,
	"author" varchar(200),
	"published_at" timestamp,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"parent_id" uuid,
	"description" text,
	"naics_codes" json DEFAULT '[]'::json NOT NULL,
	"sic_codes" json DEFAULT '[]'::json NOT NULL,
	"keywords" json DEFAULT '[]'::json NOT NULL,
	"value_chain_template" json DEFAULT '[]'::json NOT NULL,
	"regulatory_bodies" json DEFAULT '[]'::json NOT NULL,
	"data_sources" json DEFAULT '[]'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "industry_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "knowledge_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "knowledge_cat_tenant_slug" UNIQUE("tenant_id","slug")
);
--> statement-breakpoint
CREATE TABLE "knowledge_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_id" uuid,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"document_type" varchar NOT NULL,
	"source" varchar DEFAULT 'manual' NOT NULL,
	"source_url" text,
	"source_id" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_id" text,
	"source" varchar NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"company" text,
	"title" text,
	"phone" text,
	"status" varchar DEFAULT 'new' NOT NULL,
	"score" integer,
	"estimated_value" numeric,
	"data" json DEFAULT '{}'::json NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vertical" text NOT NULL,
	"metric_key" text NOT NULL,
	"metric_value" numeric NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"recorded_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_sequence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid,
	"contact_id" uuid,
	"name" varchar(300) NOT NULL,
	"description" text,
	"steps" json DEFAULT '[]'::json NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"personalization_context" json DEFAULT '{}'::json NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "permission_resource_action_unique" UNIQUE("resource","action")
);
--> statement-breakpoint
CREATE TABLE "pipeline_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"status" varchar NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pipeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connector_id" uuid,
	"name" text NOT NULL,
	"schedule" text,
	"transform_config" json DEFAULT '{}'::json NOT NULL,
	"status" varchar DEFAULT 'idle' NOT NULL,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"type" varchar NOT NULL,
	"category" varchar(200),
	"description" text,
	"features" json DEFAULT '[]'::json NOT NULL,
	"benefits" json DEFAULT '[]'::json NOT NULL,
	"use_cases" json DEFAULT '[]'::json NOT NULL,
	"target_industries" json DEFAULT '[]'::json NOT NULL,
	"price_range" json,
	"competitive_advantages" json DEFAULT '[]'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"instructions" text,
	"memory" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_name" varchar(500) NOT NULL,
	"website" text,
	"industry" varchar(200),
	"sub_industry" varchar(200),
	"location" json,
	"employee_count" integer,
	"annual_revenue" numeric,
	"fit_score" integer,
	"intent_score" integer,
	"status" varchar DEFAULT 'identified' NOT NULL,
	"source_id" text,
	"source_type" varchar(100),
	"converted_lead_id" uuid,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"enriched_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_signal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid NOT NULL,
	"signal_type" varchar NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"source_url" text,
	"source_type" varchar(100),
	"strength" integer DEFAULT 50 NOT NULL,
	"detected_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar NOT NULL,
	"base_url" text,
	"api_endpoint" text,
	"config" json DEFAULT '{}'::json NOT NULL,
	"schedule" text,
	"filters" json DEFAULT '{}'::json NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_scan_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roi_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vertical" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"metrics" json NOT NULL,
	"calculated_roi" numeric,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_map" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid,
	"lead_id" uuid,
	"company_name" varchar(500) NOT NULL,
	"contacts" json DEFAULT '[]'::json NOT NULL,
	"relationships" json DEFAULT '[]'::json NOT NULL,
	"deal_strategy" text,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_agent_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"agent_type" varchar NOT NULL,
	"name" varchar(200) NOT NULL,
	"system_prompt" text NOT NULL,
	"target_states" json DEFAULT '[]'::json NOT NULL,
	"target_industries" json DEFAULT '[]'::json NOT NULL,
	"enabled_sources" json DEFAULT '[]'::json NOT NULL,
	"search_keywords" json DEFAULT '[]'::json NOT NULL,
	"filters" json DEFAULT '{}'::json NOT NULL,
	"schedule" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"task_type" varchar NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"target_company" varchar(500),
	"target_state" varchar(2),
	"target_facility_id" text,
	"parameters" json DEFAULT '{}'::json NOT NULL,
	"source_ids" json DEFAULT '[]'::json NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"results" json,
	"findings" json DEFAULT '[]'::json NOT NULL,
	"agent_log" json DEFAULT '[]'::json NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_workflow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(300) NOT NULL,
	"description" text,
	"steps" json DEFAULT '[]'::json NOT NULL,
	"schedule" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_id" uuid,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "role_permission_unique" UNIQUE("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "role_tenant_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE TABLE "sales_brief" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prospect_id" uuid,
	"lead_id" uuid,
	"company_id" uuid,
	"brief_type" varchar NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"sections" json DEFAULT '[]'::json NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"generated_by" uuid,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_methodology" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"framework" varchar(100),
	"stages" json DEFAULT '[]'::json NOT NULL,
	"qualification_criteria" json DEFAULT '{}'::json NOT NULL,
	"ideal_customer_profile" json DEFAULT '{}'::json NOT NULL,
	"buyer_personas" json DEFAULT '[]'::json NOT NULL,
	"objection_handling" json DEFAULT '[]'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_playbook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"industry_id" uuid,
	"type" varchar NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"sections" json DEFAULT '[]'::json NOT NULL,
	"target_persona" varchar(200),
	"status" varchar DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"state" varchar(2) NOT NULL,
	"name" varchar(300) NOT NULL,
	"source_type" varchar NOT NULL,
	"agency_name" varchar(300),
	"url" text NOT NULL,
	"api_endpoint" text,
	"search_url" text,
	"data_format" varchar(20) DEFAULT 'html' NOT NULL,
	"capabilities" json DEFAULT '[]'::json NOT NULL,
	"scraping_config" json DEFAULT '{}'::json NOT NULL,
	"schedule" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_scan_at" timestamp,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"deployment_mode" varchar DEFAULT 'single-tenant' NOT NULL,
	"enabled_verticals" json DEFAULT '[]'::json NOT NULL,
	"settings" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "tenant_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"model" varchar(200) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cost_cents" numeric,
	"session_id" text,
	"agent_type" varchar(100),
	"vertical" varchar(100),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan" varchar(50) NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"end_date" timestamp NOT NULL,
	"features" json DEFAULT '{}'::json NOT NULL,
	"max_users" integer DEFAULT 5 NOT NULL,
	"max_ai_requests" integer DEFAULT 1000 NOT NULL,
	"converted_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"resource_type" varchar NOT NULL,
	"quantity" integer NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"recorded_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_role_unique" UNIQUE("user_id","role_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "value_chain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"stage" varchar NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"activities" json DEFAULT '[]'::json NOT NULL,
	"partners" json DEFAULT '[]'::json NOT NULL,
	"inputs" json DEFAULT '[]'::json NOT NULL,
	"outputs" json DEFAULT '[]'::json NOT NULL,
	"pain_points" json DEFAULT '[]'::json NOT NULL,
	"opportunities" json DEFAULT '[]'::json NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"step_results" json DEFAULT '[]'::json NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_thread" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rule" ADD CONSTRAINT "alert_rule_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_prospect_id_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_acknowledged_by_user_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscription" ADD CONSTRAINT "billing_subscription_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buying_signal" ADD CONSTRAINT "buying_signal_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buying_signal" ADD CONSTRAINT "buying_signal_prospect_id_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_profile" ADD CONSTRAINT "company_profile_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_burden" ADD CONSTRAINT "compliance_burden_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_burden" ADD CONSTRAINT "compliance_burden_prospect_id_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configurable_agent" ADD CONSTRAINT "configurable_agent_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector" ADD CONSTRAINT "connector_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_sync_log" ADD CONSTRAINT "connector_sync_log_connector_id_connector_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connector"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activity" ADD CONSTRAINT "contact_activity_contact_id_contact_record_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activity" ADD CONSTRAINT "contact_activity_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_activity" ADD CONSTRAINT "contact_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_enrichment" ADD CONSTRAINT "contact_enrichment_contact_id_contact_record_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_enrichment" ADD CONSTRAINT "contact_enrichment_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_record" ADD CONSTRAINT "contact_record_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_record" ADD CONSTRAINT "contact_record_prospect_id_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_record" ADD CONSTRAINT "contact_record_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_record" ADD CONSTRAINT "contact_record_company_id_company_profile_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_health" ADD CONSTRAINT "customer_health_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_health" ADD CONSTRAINT "customer_health_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_health" ADD CONSTRAINT "customer_health_company_id_company_profile_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_analysis" ADD CONSTRAINT "deal_analysis_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_analysis" ADD CONSTRAINT "deal_analysis_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_analysis" ADD CONSTRAINT "deal_analysis_prospect_id_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_analysis" ADD CONSTRAINT "deal_analysis_analyzed_by_user_id_fk" FOREIGN KEY ("analyzed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunk" ADD CONSTRAINT "document_chunk_document_id_knowledge_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunk" ADD CONSTRAINT "document_chunk_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filing_record" ADD CONSTRAINT "filing_record_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filing_record" ADD CONSTRAINT "filing_record_source_id_prospect_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."prospect_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filing_record" ADD CONSTRAINT "filing_record_prospect_id_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_document" ADD CONSTRAINT "industry_document_industry_id_industry_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_category" ADD CONSTRAINT "knowledge_category_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document" ADD CONSTRAINT "knowledge_document_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document" ADD CONSTRAINT "knowledge_document_category_id_knowledge_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."knowledge_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric" ADD CONSTRAINT "metric_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_sequence" ADD CONSTRAINT "outreach_sequence_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_sequence" ADD CONSTRAINT "outreach_sequence_prospect_id_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_sequence" ADD CONSTRAINT "outreach_sequence_contact_id_contact_record_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact_record"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_run" ADD CONSTRAINT "pipeline_run_pipeline_id_pipeline_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline" ADD CONSTRAINT "pipeline_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline" ADD CONSTRAINT "pipeline_connector_id_connector_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connector"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_company_id_company_profile_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file" ADD CONSTRAINT "project_file_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_file" ADD CONSTRAINT "project_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect" ADD CONSTRAINT "prospect_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect" ADD CONSTRAINT "prospect_converted_lead_id_lead_id_fk" FOREIGN KEY ("converted_lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_signal" ADD CONSTRAINT "prospect_signal_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_signal" ADD CONSTRAINT "prospect_signal_prospect_id_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_source" ADD CONSTRAINT "prospect_source_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roi_snapshot" ADD CONSTRAINT "roi_snapshot_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_map" ADD CONSTRAINT "relationship_map_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_map" ADD CONSTRAINT "relationship_map_prospect_id_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_map" ADD CONSTRAINT "relationship_map_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_agent_config" ADD CONSTRAINT "research_agent_config_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_task" ADD CONSTRAINT "research_task_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_task" ADD CONSTRAINT "research_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_workflow" ADD CONSTRAINT "research_workflow_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_brief" ADD CONSTRAINT "sales_brief_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_brief" ADD CONSTRAINT "sales_brief_prospect_id_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_brief" ADD CONSTRAINT "sales_brief_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_brief" ADD CONSTRAINT "sales_brief_company_id_company_profile_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_brief" ADD CONSTRAINT "sales_brief_generated_by_user_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_methodology" ADD CONSTRAINT "sales_methodology_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_methodology" ADD CONSTRAINT "sales_methodology_company_id_company_profile_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_playbook" ADD CONSTRAINT "sales_playbook_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_playbook" ADD CONSTRAINT "sales_playbook_industry_id_industry_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_source" ADD CONSTRAINT "state_source_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial" ADD CONSTRAINT "trial_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "value_chain" ADD CONSTRAINT "value_chain_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "value_chain" ADD CONSTRAINT "value_chain_company_id_company_profile_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_workflow_id_research_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."research_workflow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_tenant_idx" ON "activity_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "activity_log_user_idx" ON "activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_log_action_idx" ON "activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_log_created_at_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "alert_rule_tenant_idx" ON "alert_rule" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "alert_rule_category_idx" ON "alert_rule" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "alert_tenant_idx" ON "alert" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "alert_category_idx" ON "alert" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "alert_severity_idx" ON "alert" USING btree ("tenant_id","severity");--> statement-breakpoint
CREATE INDEX "alert_status_idx" ON "alert" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "alert_prospect_idx" ON "alert" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "alert_created_idx" ON "alert" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_key_tenant_idx" ON "api_key" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "api_key_hash_idx" ON "api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "billing_sub_tenant_idx" ON "billing_subscription" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "billing_sub_clerk_idx" ON "billing_subscription" USING btree ("clerk_subscription_id");--> statement-breakpoint
CREATE INDEX "buying_signal_tenant_idx" ON "buying_signal" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "buying_signal_prospect_idx" ON "buying_signal" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "buying_signal_type_idx" ON "buying_signal" USING btree ("tenant_id","signal_type");--> statement-breakpoint
CREATE INDEX "buying_signal_score_idx" ON "buying_signal" USING btree ("tenant_id","composite_score");--> statement-breakpoint
CREATE INDEX "buying_signal_detected_idx" ON "buying_signal" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "company_tenant_idx" ON "company_profile" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "company_industry_idx" ON "company_profile" USING btree ("tenant_id","industry");--> statement-breakpoint
CREATE INDEX "company_client_idx" ON "company_profile" USING btree ("tenant_id","is_client_company");--> statement-breakpoint
CREATE INDEX "compliance_burden_tenant_idx" ON "compliance_burden" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "compliance_burden_prospect_idx" ON "compliance_burden" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "compliance_burden_risk_idx" ON "compliance_burden" USING btree ("tenant_id","risk_level");--> statement-breakpoint
CREATE INDEX "configurable_agent_tenant_idx" ON "configurable_agent" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "configurable_agent_vertical_idx" ON "configurable_agent" USING btree ("vertical");--> statement-breakpoint
CREATE INDEX "configurable_agent_type_idx" ON "configurable_agent" USING btree ("tenant_id","vertical","agent_type");--> statement-breakpoint
CREATE INDEX "connector_tenant_id_idx" ON "connector" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sync_log_connector_id_idx" ON "connector_sync_log" USING btree ("connector_id");--> statement-breakpoint
CREATE INDEX "contact_activity_contact_idx" ON "contact_activity" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_activity_tenant_idx" ON "contact_activity" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contact_activity_type_idx" ON "contact_activity" USING btree ("contact_id","activity_type");--> statement-breakpoint
CREATE INDEX "enrichment_contact_idx" ON "contact_enrichment" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "enrichment_tenant_idx" ON "contact_enrichment" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "enrichment_source_idx" ON "contact_enrichment" USING btree ("contact_id","source_type");--> statement-breakpoint
CREATE INDEX "contact_tenant_idx" ON "contact_record" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contact_prospect_idx" ON "contact_record" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "contact_lead_idx" ON "contact_record" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "contact_company_idx" ON "contact_record" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "contact_email_idx" ON "contact_record" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "contact_status_idx" ON "contact_record" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "contact_role_idx" ON "contact_record" USING btree ("tenant_id","role");--> statement-breakpoint
CREATE INDEX "customer_health_tenant_idx" ON "customer_health" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "customer_health_lead_idx" ON "customer_health" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "customer_health_status_idx" ON "customer_health" USING btree ("tenant_id","health_status");--> statement-breakpoint
CREATE INDEX "customer_health_score_idx" ON "customer_health" USING btree ("tenant_id","health_score");--> statement-breakpoint
CREATE INDEX "deal_analysis_tenant_idx" ON "deal_analysis" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deal_analysis_lead_idx" ON "deal_analysis" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "deal_analysis_outcome_idx" ON "deal_analysis" USING btree ("tenant_id","outcome");--> statement-breakpoint
CREATE INDEX "deal_analysis_date_idx" ON "deal_analysis" USING btree ("analyzed_at");--> statement-breakpoint
CREATE INDEX "chunk_document_idx" ON "document_chunk" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunk_tenant_idx" ON "document_chunk" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "filing_tenant_idx" ON "filing_record" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "filing_source_idx" ON "filing_record" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "filing_external_idx" ON "filing_record" USING btree ("tenant_id","source_id","external_id");--> statement-breakpoint
CREATE INDEX "filing_type_idx" ON "filing_record" USING btree ("tenant_id","filing_type");--> statement-breakpoint
CREATE INDEX "filing_state_idx" ON "filing_record" USING btree ("tenant_id","state");--> statement-breakpoint
CREATE INDEX "filing_date_idx" ON "filing_record" USING btree ("filing_date");--> statement-breakpoint
CREATE INDEX "industry_doc_industry_idx" ON "industry_document" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX "industry_doc_type_idx" ON "industry_document" USING btree ("industry_id","doc_type");--> statement-breakpoint
CREATE INDEX "industry_doc_tenant_idx" ON "industry_document" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "industry_slug_idx" ON "industry" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "industry_parent_idx" ON "industry" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "knowledge_cat_tenant_idx" ON "knowledge_category" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "knowledge_doc_tenant_idx" ON "knowledge_document" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "knowledge_doc_category_idx" ON "knowledge_document" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "knowledge_doc_status_idx" ON "knowledge_document" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "knowledge_doc_type_idx" ON "knowledge_document" USING btree ("tenant_id","document_type");--> statement-breakpoint
CREATE INDEX "lead_tenant_id_idx" ON "lead" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lead_status_idx" ON "lead" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "lead_external_id_idx" ON "lead" USING btree ("tenant_id","external_id");--> statement-breakpoint
CREATE INDEX "lead_assigned_to_idx" ON "lead" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "metric_tenant_vertical_idx" ON "metric" USING btree ("tenant_id","vertical");--> statement-breakpoint
CREATE INDEX "metric_key_idx" ON "metric" USING btree ("tenant_id","vertical","metric_key");--> statement-breakpoint
CREATE INDEX "metric_recorded_at_idx" ON "metric" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "outreach_seq_tenant_idx" ON "outreach_sequence" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "outreach_seq_prospect_idx" ON "outreach_sequence" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "outreach_seq_contact_idx" ON "outreach_sequence" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "outreach_seq_status_idx" ON "outreach_sequence" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "pipeline_run_pipeline_id_idx" ON "pipeline_run" USING btree ("pipeline_id");--> statement-breakpoint
CREATE INDEX "pipeline_tenant_id_idx" ON "pipeline" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "product_tenant_idx" ON "product" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "product_company_idx" ON "product" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "product_type_idx" ON "product" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "prospect_tenant_idx" ON "prospect" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prospect_status_idx" ON "prospect" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "prospect_industry_idx" ON "prospect" USING btree ("tenant_id","industry");--> statement-breakpoint
CREATE INDEX "prospect_fit_idx" ON "prospect" USING btree ("tenant_id","fit_score");--> statement-breakpoint
CREATE INDEX "signal_tenant_idx" ON "prospect_signal" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "signal_prospect_idx" ON "prospect_signal" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "signal_type_idx" ON "prospect_signal" USING btree ("tenant_id","signal_type");--> statement-breakpoint
CREATE INDEX "signal_detected_idx" ON "prospect_signal" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "prospect_source_tenant_idx" ON "prospect_source" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prospect_source_type_idx" ON "prospect_source" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "roi_snapshot_tenant_vertical_idx" ON "roi_snapshot" USING btree ("tenant_id","vertical");--> statement-breakpoint
CREATE INDEX "rel_map_tenant_idx" ON "relationship_map" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "rel_map_prospect_idx" ON "relationship_map" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "rel_map_lead_idx" ON "relationship_map" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "research_agent_tenant_idx" ON "research_agent_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "research_agent_type_idx" ON "research_agent_config" USING btree ("tenant_id","agent_type");--> statement-breakpoint
CREATE INDEX "research_task_tenant_idx" ON "research_task" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "research_task_status_idx" ON "research_task" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "research_task_type_idx" ON "research_task" USING btree ("tenant_id","task_type");--> statement-breakpoint
CREATE INDEX "research_task_state_idx" ON "research_task" USING btree ("tenant_id","target_state");--> statement-breakpoint
CREATE INDEX "research_task_user_idx" ON "research_task" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "research_wf_tenant_idx" ON "research_workflow" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "role_tenant_idx" ON "role" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sales_brief_tenant_idx" ON "sales_brief" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sales_brief_prospect_idx" ON "sales_brief" USING btree ("prospect_id");--> statement-breakpoint
CREATE INDEX "sales_brief_lead_idx" ON "sales_brief" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "sales_brief_status_idx" ON "sales_brief" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "sales_method_company_idx" ON "sales_methodology" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "sales_method_tenant_idx" ON "sales_methodology" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "playbook_tenant_idx" ON "sales_playbook" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "playbook_industry_idx" ON "sales_playbook" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX "playbook_type_idx" ON "sales_playbook" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "playbook_status_idx" ON "sales_playbook" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "state_source_tenant_idx" ON "state_source" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "state_source_state_idx" ON "state_source" USING btree ("tenant_id","state");--> statement-breakpoint
CREATE INDEX "state_source_type_idx" ON "state_source" USING btree ("tenant_id","source_type");--> statement-breakpoint
CREATE INDEX "tenant_slug_idx" ON "tenant" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "token_usage_tenant_idx" ON "token_usage" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "token_usage_user_idx" ON "token_usage" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "token_usage_model_idx" ON "token_usage" USING btree ("tenant_id","model");--> statement-breakpoint
CREATE INDEX "token_usage_created_idx" ON "token_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trial_tenant_idx" ON "trial" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "trial_status_idx" ON "trial" USING btree ("status");--> statement-breakpoint
CREATE INDEX "usage_record_tenant_idx" ON "usage_record" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "usage_record_type_idx" ON "usage_record" USING btree ("tenant_id","resource_type");--> statement-breakpoint
CREATE INDEX "usage_record_date_idx" ON "usage_record" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "user_role_user_idx" ON "user_role" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_tenant_idx" ON "user_role" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "value_chain_company_idx" ON "value_chain" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "value_chain_tenant_idx" ON "value_chain" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "wf_run_workflow_idx" ON "workflow_run" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "wf_run_tenant_idx" ON "workflow_run" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "wf_run_status_idx" ON "workflow_run" USING btree ("tenant_id","status");--> statement-breakpoint
ALTER TABLE "chat_thread" ADD CONSTRAINT "chat_thread_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;