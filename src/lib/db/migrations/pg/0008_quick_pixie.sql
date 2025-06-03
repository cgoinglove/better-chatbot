ALTER TABLE "mcp_server_customization" DROP CONSTRAINT "mcp_server_customization_user_id_mcp_server_id_unique";--> statement-breakpoint
ALTER TABLE "mcp_server_customization" DROP CONSTRAINT "mcp_server_customization_mcp_server_id_mcp_server_id_fk";
--> statement-breakpoint
ALTER TABLE "mcp_server_customization" ADD COLUMN "mcp_server_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_server_customization" DROP COLUMN "mcp_server_id";--> statement-breakpoint
ALTER TABLE "mcp_server_customization" ADD CONSTRAINT "mcp_server_customization_user_id_mcp_server_name_unique" UNIQUE("user_id","mcp_server_name");