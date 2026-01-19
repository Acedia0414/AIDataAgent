CREATE TABLE `full_text_indexes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` int NOT NULL,
	`indexName` varchar(255) NOT NULL,
	`enabled` boolean DEFAULT true,
	`changeTrackingMode` varchar(50),
	`fields` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `full_text_indexes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `table_indexes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` int NOT NULL,
	`indexName` varchar(255) NOT NULL,
	`isUnique` boolean DEFAULT false,
	`isPrimaryIndex` boolean DEFAULT false,
	`allowDuplicates` boolean DEFAULT true,
	`enabled` boolean DEFAULT true,
	`fields` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `table_indexes_id` PRIMARY KEY(`id`)
);
