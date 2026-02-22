CREATE TABLE `comments_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableName` varchar(255) NOT NULL,
	`fieldName` varchar(255) NOT NULL,
	`comments` text NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comments_data_id` PRIMARY KEY(`id`)
);
