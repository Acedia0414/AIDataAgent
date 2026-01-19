CREATE TABLE `column_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleName` varchar(255) NOT NULL,
	`tableName` varchar(255) NOT NULL,
	`columnName` varchar(255) NOT NULL,
	`permissionType` enum('allow','deny') NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `column_permissions_id` PRIMARY KEY(`id`)
);
