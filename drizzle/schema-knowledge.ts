/**
 * Knowledge Base Schema
 * 
 * Stores metadata about uploaded documents in the knowledge base
 * The actual embeddings are stored in the vector store (in-memory or external)
 * This schema tracks document metadata for management and auditing
 */

import { int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Knowledge base documents
 * Tracks uploaded documents and their processing status
 */
export const knowledgeBaseDocuments = mysqlTable("knowledge_base_documents", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique document ID used in vector store */
  documentId: varchar("document_id", { length: 64 }).notNull().unique(),
  /** Original filename */
  filename: varchar("filename", { length: 512 }).notNull(),
  /** File type/extension */
  fileType: varchar("file_type", { length: 32 }).notNull(),
  /** MIME type */
  mimeType: varchar("mime_type", { length: 128 }),
  /** File size in bytes */
  fileSize: int("file_size").notNull(),
  /** Number of chunks created */
  chunkCount: int("chunk_count").notNull(),
  /** Total characters processed */
  charCount: int("char_count").notNull(),
  /** Processing time in milliseconds */
  processingTime: int("processing_time").notNull(),
  /** Processing status */
  status: varchar("status", { length: 32 }).notNull().default("completed"),
  /** Error message if processing failed */
  errorMessage: text("error_message"),
  /** User who uploaded the document */
  uploadedBy: int("uploaded_by").notNull(),
  /** Upload timestamp */
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type KnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferSelect;
export type InsertKnowledgeBaseDocument = typeof knowledgeBaseDocuments.$inferInsert;
