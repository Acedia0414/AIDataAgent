/**
 * RAG Orchestrator - Coordinates document processing, embedding, and retrieval
 * 
 * This is the main entry point for the RAG system. It orchestrates:
 * 1. Document processing (extract text from files)
 * 2. Text chunking (split into manageable pieces)
 * 3. Embedding generation (convert text to vectors)
 * 4. Vector storage (store embeddings for retrieval)
 * 5. Similarity search (find relevant chunks for queries)
 * 
 * Usage:
 * - Call processDocument() to add documents to the knowledge base
 * - Call retrieveContext() to get relevant context for queries
 */

import { nanoid } from "nanoid";
import { processDocument, getSupportedExtensions } from "./DocumentProcessor";
import { chunkText, DEFAULT_CHUNK_CONFIG, type TextChunk } from "./TextChunker";
import {
  getDefaultEmbeddingProvider,
  type EmbeddingProvider,
} from "./EmbeddingProvider";
import {
  getDefaultVectorStore,
  type VectorStore,
  type VectorDocument,
  type SearchResult,
} from "./VectorStore";

/**
 * Document processing result
 */
export interface ProcessingResult {
  /** Unique document ID */
  documentId: string;
  /** Original filename */
  filename: string;
  /** Number of chunks created */
  chunkCount: number;
  /** Total characters processed */
  charCount: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Retrieved context for a query
 */
export interface RetrievedContext {
  /** Relevant text chunks */
  chunks: Array<{
    text: string;
    source: string;
    score: number;
  }>;
  /** Source documents referenced */
  sources: Array<{
    documentId: string;
    filename: string;
  }>;
}

/**
 * RAG Orchestrator
 * Main class that coordinates all RAG components
 */
export class RAGOrchestrator {
  private embeddingProvider: EmbeddingProvider | null = null;
  private vectorStore: VectorStore;

  constructor(
    embeddingProvider?: EmbeddingProvider,
    vectorStore?: VectorStore
  ) {
    this.embeddingProvider = embeddingProvider || null;
    this.vectorStore = vectorStore || getDefaultVectorStore();
  }

  /**
   * Ensure embedding provider is initialized
   */
  private async getEmbeddingProvider(): Promise<EmbeddingProvider> {
    if (!this.embeddingProvider) {
      this.embeddingProvider = await getDefaultEmbeddingProvider();
    }
    return this.embeddingProvider;
  }

  /**
   * Process a document and add it to the knowledge base
   * 
   * Steps:
   * 1. Extract text from file
   * 2. Chunk text into smaller pieces
   * 3. Generate embeddings for each chunk
   * 4. Store chunks with embeddings in vector store
   * 
   * @param fileBuffer - File content as Buffer
   * @param filename - Original filename
   * @param mimeType - Optional MIME type
   * @returns Processing result with document ID and statistics
   */
  async processDocument(
    fileBuffer: Buffer,
    filename: string,
    mimeType?: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const documentId = nanoid();

    // Step 1: Extract text from document
    const docContent = await processDocument(fileBuffer, filename, mimeType);

    // Step 2: Chunk text
    const chunks = chunkText(docContent.text, DEFAULT_CHUNK_CONFIG, {
      documentId,
      filename,
      fileType: filename.split(".").pop() || "unknown",
      uploadedAt: new Date(),
    });

    if (chunks.length === 0) {
      throw new Error("No text content found in document");
    }

    // Step 3 & 4: Generate embeddings and store
    const embeddingProvider = await this.getEmbeddingProvider();
    const vectorDocuments: VectorDocument[] = [];

    for (const chunk of chunks) {
      const embeddingResult = await embeddingProvider.embed(chunk.text);

      const vectorDoc: VectorDocument = {
        id: nanoid(),
        text: chunk.text,
        embedding: embeddingResult.embedding,
        metadata: {
          documentId,
          chunkIndex: chunk.index,
          filename,
          fileType: filename.split(".").pop() || "unknown",
          uploadedAt: chunk.metadata.uploadedAt || new Date(),
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
        },
      };

      vectorDocuments.push(vectorDoc);
    }

    // Store all chunks in vector store
    await this.vectorStore.addBatch(vectorDocuments);

    const processingTime = Date.now() - startTime;

    return {
      documentId,
      filename,
      chunkCount: chunks.length,
      charCount: docContent.text.length,
      processingTime,
    };
  }

  /**
   * Retrieve relevant context for a query
   * 
   * Steps:
   * 1. Generate embedding for query
   * 2. Search vector store for similar chunks
   * 3. Return top results with source information
   * 
   * @param query - User's natural language query
   * @param limit - Maximum number of chunks to retrieve (default: 5)
   * @returns Retrieved context with relevant chunks and sources
   */
  async retrieveContext(
    query: string,
    limit: number = 5
  ): Promise<RetrievedContext> {
    // Generate embedding for query
    const embeddingProvider = await this.getEmbeddingProvider();
    const queryEmbedding = await embeddingProvider.embed(query);

    // Search for similar chunks
    const searchResults = await this.vectorStore.search(
      queryEmbedding.embedding,
      limit
    );

    // Format results
    const chunks = searchResults.map((result) => ({
      text: result.document.text,
      source: result.document.metadata.filename,
      score: result.score,
    }));

    // Extract unique sources
    const sourceMap = new Map<string, { documentId: string; filename: string }>();
    for (const result of searchResults) {
      const docId = result.document.metadata.documentId;
      if (!sourceMap.has(docId)) {
        sourceMap.set(docId, {
          documentId: docId,
          filename: result.document.metadata.filename,
        });
      }
    }

    return {
      chunks,
      sources: Array.from(sourceMap.values()),
    };
  }

  /**
   * Delete a document and all its chunks from the knowledge base
   * 
   * @param documentId - Document ID to delete
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.vectorStore.deleteByDocumentId(documentId);
  }

  /**
   * Get statistics about the knowledge base
   */
  async getStats(): Promise<{
    totalChunks: number;
    embeddingModel: string;
    vectorStore: string;
  }> {
    const embeddingProvider = await this.getEmbeddingProvider();

    return {
      totalChunks: await this.vectorStore.count(),
      embeddingModel: embeddingProvider.model,
      vectorStore: this.vectorStore.name,
    };
  }

  /**
   * Clear all documents from the knowledge base
   */
  async clear(): Promise<void> {
    await this.vectorStore.clear();
  }

  /**
   * Get list of supported file formats
   */
  getSupportedFormats(): string[] {
    return getSupportedExtensions();
  }
}

/**
 * Default RAG orchestrator instance (singleton)
 */
let defaultOrchestrator: RAGOrchestrator | null = null;

/**
 * Get or create the default RAG orchestrator
 */
export function getDefaultRAGOrchestrator(): RAGOrchestrator {
  if (!defaultOrchestrator) {
    defaultOrchestrator = new RAGOrchestrator();
  }
  return defaultOrchestrator;
}
