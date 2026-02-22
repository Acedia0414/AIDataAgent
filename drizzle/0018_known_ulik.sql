CREATE TABLE `table_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableName` varchar(255) NOT NULL,
	`tableRule` text NOT NULL,
	`isActive` boolean DEFAULT true,
	`priority` int DEFAULT 0,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `table_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `table_rules_tableName_unique` UNIQUE(`tableName`)
);
