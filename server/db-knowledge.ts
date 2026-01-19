/**
 * Database helpers for knowledge base operations
 */

import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  knowledgeBaseDocuments,
  type KnowledgeBaseDocument,
  type InsertKnowledgeBaseDocument,
} from "../drizzle/schema";

/**
 * Create a knowledge base document record
 */
export async function createKnowledgeBaseDocument(
  doc: InsertKnowledgeBaseDocument
): Promise<KnowledgeBaseDocument> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const [inserted] = await db.insert(knowledgeBaseDocuments).values(doc);

  // Fetch the inserted document
  const [result] = await db
    .select()
    .from(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.id, inserted.insertId))
    .limit(1);

  if (!result) {
    throw new Error("Failed to create knowledge base document");
  }

  return result;
}

/**
 * Get all knowledge base documents for a user
 */
export async function getKnowledgeBaseDocuments(
  userId: number
): Promise<KnowledgeBaseDocument[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.uploadedBy, userId))
    .orderBy(desc(knowledgeBaseDocuments.uploadedAt));
}

/**
 * Get a knowledge base document by document ID
 */
export async function getKnowledgeBaseDocumentByDocId(
  documentId: string
): Promise<KnowledgeBaseDocument | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const [result] = await db
    .select()
    .from(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.documentId, documentId))
    .limit(1);

  return result;
}

/**
 * Delete a knowledge base document
 */
export async function deleteKnowledgeBaseDocument(
  documentId: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .delete(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.documentId, documentId));
}

/**
 * Get knowledge base statistics for a user
 */
export async function getKnowledgeBaseStats(userId: number): Promise<{
  totalDocuments: number;
  totalChunks: number;
  totalCharacters: number;
}> {
  const db = await getDb();
  if (!db) {
    return { totalDocuments: 0, totalChunks: 0, totalCharacters: 0 };
  }

  const docs = await getKnowledgeBaseDocuments(userId);

  return {
    totalDocuments: docs.length,
    totalChunks: docs.reduce((sum, doc) => sum + doc.chunkCount, 0),
    totalCharacters: docs.reduce((sum, doc) => sum + doc.charCount, 0),
  };
}
