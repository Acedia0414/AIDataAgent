CREATE TABLE `labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`labelId` varchar(255) NOT NULL,
	`labelText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `labels_id` PRIMARY KEY(`id`),
	CONSTRAINT `labels_labelId_unique` UNIQUE(`labelId`)
);
--> statement-breakpoint
ALTER TABLE `metadata_fields` ADD `label` varchar(255);--> statement-breakpoint
ALTER TABLE `metadata_fields` ADD `labelText` text;--> statement-breakpoint
ALTER TABLE `metadata_tables` ADD `label` varchar(255);--> statement-breakpoint
ALTER TABLE `metadata_tables` ADD `labelText` text;