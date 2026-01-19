CREATE TABLE `database_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`databaseType` enum('sqlserver','mysql','postgresql','sqlite','oracle') NOT NULL,
	`host` varchar(500) NOT NULL,
	`port` int,
	`database` varchar(255) NOT NULL,
	`authMode` enum('sql','windows') NOT NULL DEFAULT 'sql',
	`username` varchar(255),
	`encryptedPassword` text,
	`domain` varchar(255),
	`connectionString` text,
	`isActive` boolean DEFAULT false,
	`lastTestedAt` timestamp,
	`lastTestStatus` enum('success','failed','pending'),
	`lastTestError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `database_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `llm_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('openai','azure_openai','manus_builtin') NOT NULL,
	`apiKey` text,
	`endpoint` varchar(500),
	`deploymentName` varchar(255),
	`model` varchar(100) NOT NULL,
	`temperature` int DEFAULT 70,
	`maxTokens` int DEFAULT 4000,
	`isActive` boolean DEFAULT false,
	`lastTestedAt` timestamp,
	`lastTestStatus` enum('success','failed','pending'),
	`lastTestError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `llm_configurations_id` PRIMARY KEY(`id`)
);
