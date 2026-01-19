CREATE TABLE `azure_sql_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`server` varchar(500) NOT NULL,
	`database` varchar(255) NOT NULL,
	`username` varchar(255) NOT NULL,
	`encryptedPassword` text NOT NULL,
	`port` int DEFAULT 1433,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `azure_sql_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metadata_fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` int NOT NULL,
	`fieldName` varchar(255) NOT NULL,
	`fieldType` varchar(100) NOT NULL,
	`description` text,
	`businessMeaning` text,
	`isPrimaryKey` boolean DEFAULT false,
	`isForeignKey` boolean DEFAULT false,
	`referencedTable` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metadata_fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metadata_tables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableName` varchar(255) NOT NULL,
	`description` text,
	`businessPurpose` text,
	`codeLayerInfo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metadata_tables_id` PRIMARY KEY(`id`),
	CONSTRAINT `metadata_tables_tableName_unique` UNIQUE(`tableName`)
);
--> statement-breakpoint
CREATE TABLE `query_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`conversationId` int,
	`messageId` int,
	`naturalLanguageQuery` text NOT NULL,
	`generatedSql` text NOT NULL,
	`executionStatus` enum('success','error','pending') NOT NULL,
	`executionTime` int,
	`rowCount` int,
	`errorMessage` text,
	`resultData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `query_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_security_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roleName` varchar(255) NOT NULL,
	`roleId` varchar(255),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_security_roles_id` PRIMARY KEY(`id`)
);
