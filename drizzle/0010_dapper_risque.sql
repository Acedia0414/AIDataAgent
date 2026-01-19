CREATE TABLE `multi_step_execution_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`executionId` int NOT NULL,
	`stepNumber` int NOT NULL,
	`description` text NOT NULL,
	`sheetName` varchar(255),
	`filterCondition` text,
	`sql` text,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`rowCount` int,
	`columns` json,
	`error` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `multi_step_execution_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `multi_step_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`conversationId` int,
	`naturalLanguageQuery` text NOT NULL,
	`outputFormat` enum('excel','json','table') NOT NULL,
	`totalSteps` int NOT NULL,
	`planExplanation` text,
	`status` enum('pending','running','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`durationMs` int,
	`fileUrl` text,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `multi_step_executions_id` PRIMARY KEY(`id`)
);
