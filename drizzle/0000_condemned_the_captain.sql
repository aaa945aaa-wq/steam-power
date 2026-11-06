CREATE TABLE `api_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`body` text,
	`fetched_at` integer,
	`expires_at` integer DEFAULT 0 NOT NULL,
	`retry_at` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cache_expiry` ON `api_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `api_quota` (
	`scope` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`used` integer NOT NULL,
	`cooldown_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`steam_app_id` integer NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`schema_version` integer NOT NULL,
	`payload_json` text NOT NULL,
	FOREIGN KEY (`steam_app_id`) REFERENCES `games`(`steam_app_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_identity` ON `game_sources` (`provider`,`external_id`);--> statement-breakpoint
CREATE INDEX `source_game` ON `game_sources` (`steam_app_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`steam_app_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`product_type` text,
	`parent_app_id` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`steam_app_id` integer NOT NULL,
	`category` text NOT NULL,
	`provider` text NOT NULL,
	`method` text NOT NULL,
	`method_version` text NOT NULL,
	`scope` text NOT NULL,
	`observed_at` integer NOT NULL,
	`expires_at` integer,
	`sample_count` integer,
	`payload_json` text NOT NULL,
	FOREIGN KEY (`steam_app_id`) REFERENCES `games`(`steam_app_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `observation_lookup` ON `game_observations` (`steam_app_id`,`category`,`observed_at`);