CREATE TABLE `github_repository` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `path` text NOT NULL,
  `description` text,
  `is_enabled` integer DEFAULT true NOT NULL,
  `last_indexed` integer,
  `user_id` text NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `github_file_index` (
  `id` text PRIMARY KEY NOT NULL,
  `repository_id` text NOT NULL,
  `file_path` text NOT NULL,
  `content` text,
  `language` text,
  `last_indexed` integer NOT NULL,
  `created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`repository_id`) REFERENCES `github_repository`(`id`) ON DELETE CASCADE
);

CREATE INDEX `github_repository_user_id_idx` ON `github_repository` (`user_id`);
CREATE INDEX `github_file_index_repository_id_idx` ON `github_file_index` (`repository_id`);
CREATE INDEX `github_file_index_file_path_idx` ON `github_file_index` (`file_path`);
