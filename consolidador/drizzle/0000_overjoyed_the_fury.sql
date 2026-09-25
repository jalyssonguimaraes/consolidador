CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`source_key` text NOT NULL,
	`broker` text NOT NULL,
	`date` text NOT NULL,
	`number` text NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notes_owner_source` ON `notes` (`owner`,`source_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `notes_owner_document` ON `notes` (`owner`,`broker`,`date`,`number`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`note_id` text NOT NULL,
	`payload` text NOT NULL,
	`created` text NOT NULL
);
