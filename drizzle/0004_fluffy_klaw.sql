CREATE TABLE `knowledge_base_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` varchar(64) NOT NULL,
	`filename` varchar(512) NOT NULL,
	`file_type` varchar(32) NOT NULL,
	`mime_type` varchar(128),
	`file_size` int NOT NULL,
	`chunk_count` int NOT NULL,
	`char_count` int NOT NULL,
	`processing_time` int NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'completed',
	`error_message` text,
	`uploaded_by` int NOT NULL,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_base_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `knowledge_base_documents_document_id_unique` UNIQUE(`document_id`)
);
