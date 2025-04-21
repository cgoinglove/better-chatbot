CREATE TABLE `rules` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `content` text NOT NULL,
  `is_enabled` integer DEFAULT true NOT NULL,
  `priority` integer DEFAULT 0 NOT NULL,
  `user_id` text NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
