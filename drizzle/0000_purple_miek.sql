CREATE TABLE `application` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`resume_id` integer,
	`cover_letter` text,
	`status` text DEFAULT 'new' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `job` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`location` text,
	`remote` integer,
	`salary_min` integer,
	`salary_max` integer,
	`currency` text,
	`url` text NOT NULL,
	`description` text,
	`source` text NOT NULL,
	`source_id` text,
	`dedup_key` text NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_dedup_key_idx` ON `job` (`dedup_key`);--> statement-breakpoint
CREATE TABLE `match` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`score` real NOT NULL,
	`reasons` text DEFAULT '[]' NOT NULL,
	`concerns` text DEFAULT '[]' NOT NULL,
	`model` text,
	`scored_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role_targets` text DEFAULT '[]' NOT NULL,
	`seniority` text,
	`locations` text DEFAULT '[]' NOT NULL,
	`remote_pref` text DEFAULT 'any' NOT NULL,
	`salary_floor` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`dealbreakers` text DEFAULT '[]' NOT NULL,
	`skills` text DEFAULT '[]' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resume` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT 'Master resume' NOT NULL,
	`job_id` integer,
	`is_master` integer DEFAULT false NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `run` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`finished_at` integer,
	`source_counts` text DEFAULT '{}' NOT NULL,
	`fetched` integer DEFAULT 0 NOT NULL,
	`added` integer DEFAULT 0 NOT NULL,
	`scored` integer DEFAULT 0 NOT NULL,
	`errors` text DEFAULT '[]' NOT NULL,
	`trigger` text DEFAULT 'manual' NOT NULL
);
