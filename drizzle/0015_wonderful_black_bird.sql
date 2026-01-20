DROP TABLE `multi_step_execution_steps`;--> statement-breakpoint
DROP TABLE `multi_step_executions`;--> statement-breakpoint
ALTER TABLE `llm_configurations` MODIFY COLUMN `provider` enum('openai','azure_openai','manus_builtin','custom','google','google_ai') NOT NULL;