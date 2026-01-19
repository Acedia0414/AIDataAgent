CREATE TABLE `method_code` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableId` int NOT NULL,
	`methodName` varchar(255) NOT NULL,
	`sourceCode` text NOT NULL,
	`returnType` varchar(255),
	`parameters` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `method_code_id` PRIMARY KEY(`id`)
);
