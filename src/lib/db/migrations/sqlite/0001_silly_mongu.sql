CREATE TABLE IF NOT EXISTS `mcp_server_binding` (
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`owner_type`, `owner_id`)
);
