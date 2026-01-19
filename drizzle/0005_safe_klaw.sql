CREATE TABLE `table_relationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceTableId` int NOT NULL,
	`relationName` varchar(255) NOT NULL,
	`relatedTable` varchar(255) NOT NULL,
	`cardinality` varchar(50),
	`relatedTableCardinality` varchar(50),
	`relationshipType` varchar(50),
	`onDelete` varchar(50),
	`sourceField` varchar(255),
	`relatedField` varchar(255),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `table_relationships_id` PRIMARY KEY(`id`)
);
