/**
 * Knowledge Base tRPC Router
 * 
 * Endpoints for managing the RAG knowledge base:
 * - Upload documents
 * - List documents
 * - Delete documents
 * - Get statistics
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDefaultRAGOrchestrator } from "./rag/RAGOrchestrator";
import * as dbKnowledge from "./db-knowledge";

export const knowledgeBaseRouter = router({
  /**
   * Upload and process a document
   */
  upload: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        mimeType: z.string().optional(),
        fileData: z.string(), // Base64 encoded file data
      })
    )
    .mutation(async ({ input, ctx }) => {
      const orchestrator = getDefaultRAGOrchestrator();

      // Decode base64 file data
      const fileBuffer = Buffer.from(input.fileData, "base64");

      // Process document through RAG pipeline
      const result = await orchestrator.processDocument(
        fileBuffer,
        input.filename,
        input.mimeType
      );

      // Save metadata to database
      const dbRecord = await dbKnowledge.createKnowledgeBaseDocument({
        documentId: result.documentId,
        filename: result.filename,
        fileType: input.filename.split(".").pop() || "unknown",
        mimeType: input.mimeType || null,
        fileSize: fileBuffer.length,
        chunkCount: result.chunkCount,
        charCount: result.charCount,
        processingTime: result.processingTime,
        status: "completed",
        errorMessage: null,
        uploadedBy: ctx.user.id,
      });

      return {
        success: true,
        documentId: result.documentId,
        filename: result.filename,
        chunkCount: result.chunkCount,
        processingTime: result.processingTime,
      };
    }),

  /**
   * List all documents in knowledge base
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const documents = await dbKnowledge.getKnowledgeBaseDocuments(ctx.user.id);
    return documents;
  }),

  /**
   * Delete a document from knowledge base
   */
  delete: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const orchestrator = getDefaultRAGOrchestrator();

      // Delete from vector store
      await orchestrator.deleteDocument(input.documentId);

      // Delete from database
      await dbKnowledge.deleteKnowledgeBaseDocument(input.documentId);

      return { success: true };
    }),

  /**
   * Re-process an existing document
   * Useful when updating embeddings or changing chunking strategy
   */
  reprocess: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const orchestrator = getDefaultRAGOrchestrator();

      // Get document metadata from database
      const doc = await dbKnowledge.getKnowledgeBaseDocumentByDocId(input.documentId);
      if (!doc) {
        throw new Error("Document not found");
      }

      // Note: In a real implementation, you would need to store the original file
      // For now, we'll just return an error indicating this feature requires file storage
      throw new Error(
        "Document re-processing requires the original file to be stored. " +
        "This feature will be available once file storage is implemented."
      );
    }),

  /**
   * Get knowledge base statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const orchestrator = getDefaultRAGOrchestrator();

    const dbStats = await dbKnowledge.getKnowledgeBaseStats(ctx.user.id);
    const ragStats = await orchestrator.getStats();

    return {
      ...dbStats,
      embeddingModel: ragStats.embeddingModel,
      vectorStore: ragStats.vectorStore,
    };
  }),

  /**
   * Get supported file formats
   */
  supportedFormats: protectedProcedure.query(async () => {
    const orchestrator = getDefaultRAGOrchestrator();
    return orchestrator.getSupportedFormats();
  }),
});
