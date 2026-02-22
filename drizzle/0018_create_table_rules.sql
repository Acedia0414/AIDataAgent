-- Create table_rules table
CREATE TABLE `table_rules` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`tableName` varchar(255) NOT NULL UNIQUE,
	`tableRule` text NOT NULL,
	`isActive` boolean DEFAULT true,
	`priority` int DEFAULT 0,
	`description` text,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);
