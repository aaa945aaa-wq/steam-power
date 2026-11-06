ALTER TABLE `api_cache` ADD `failure_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `api_cache` ADD `last_failure_at` integer;--> statement-breakpoint
ALTER TABLE `api_cache` ADD `error_source` text;