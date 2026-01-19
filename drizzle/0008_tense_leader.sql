ALTER TABLE `table_relationships` ADD `isInferred` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `table_relationships` ADD `inferredFrom` varchar(255);