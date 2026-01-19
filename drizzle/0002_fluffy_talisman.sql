CREATE TABLE `azure_ad_group_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`azureGroupId` varchar(255) NOT NULL,
	`azureGroupName` varchar(500),
	`d365RoleName` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `azure_ad_group_mappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `azure_ad_group_mappings_azureGroupId_unique` UNIQUE(`azureGroupId`)
);
