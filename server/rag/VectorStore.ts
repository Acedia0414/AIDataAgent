/**
 * Vector Store - Storage and retrieval of embedding vectors
 * 
 * What is a vector store?
 * - Database optimized for storing and searching high-dimensional vectors
 * - Supports similarity search (find vectors similar to a query vector)
 * - Essential component of RAG systems
 * 
 * Why abstraction?
 * - Easy to switch between different vector database providers
 * - Start with simple in-memory store for development
 * - Upgrade to production-grade stores (Pinecone, Weaviate) later
 * 
 * Supported Stores:
 * - InMemory: Simple array-based store (good for demos, lost on restart)
 * - Pinecone: Cloud vector database (production-ready, requires API)
 * - Weaviate: Self-hosted or cloud (production-ready, more control)
 */

import type { EmbeddingVector } from "./EmbeddingProvider";

/**
 * Document stored in vector database
 */
export interface VectorDocument {
  /** Unique identifier */
  id: string;
  /** The text content */
  text: string;
  /** Embedding vector */
  embedding: EmbeddingVector;
  /** Additional metadata */
  metadata: {
    /** Source document ID */
    documentId: string;
    /** Chunk index within document */
    chunkIndex: number;
    /** Original filename */
    filename: string;
    /** File type */
    fileType: string;
    /** Upload timestamp */
    uploadedAt: Date;
    /** Any additional custom metadata */
    [key: string]: any;
  };
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  /** The matching document */
  document: VectorDocument;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
}

/**
 * Abstract vector store interface
 */
export interface VectorStore {
  /** Store name for identification */
  readonly name: string;

  /**
   * Add a single document to the store
   * @param document - Document with embedding to store
   */
  add(document: VectorDocument): Promise<void>;

  /**
   * Add multiple documents in batch
   * More efficient than calling add() multiple times
   * @param documents - Array of documents to store
   */
  addBatch(documents: VectorDocument[]): Promise<void>;

  /**
   * Search for similar documents
   * @param queryEmbedding - Query vector to search for
   * @param limit - Maximum number of results to return
   * @param filter - Optional metadata filter
   * @returns Array of search results sorted by similarity (highest first)
   */
  search(
    queryEmbedding: EmbeddingVector,
    limit: number,
    filter?: Record<string, any>
  ): Promise<SearchResult[]>;

  /**
   * Delete a document by ID
   * @param id - Document ID to delete
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all documents for a source document
   * @param documentId - Source document ID
   */
  deleteByDocumentId(documentId: string): Promise<void>;

  /**
   * Get total number of documents in store
   */
  count(): Promise<number>;

  /**
   * Clear all documents from store
   */
  clear(): Promise<void>;
}

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * In-Memory Vector Store
 * 
 * Simple array-based implementation for development and testing
 * 
 * Pros:
 * - No external dependencies
 * - Fast for small datasets (<10k documents)
 * - Easy to debug
 * 
 * Cons:
 * - Data lost on server restart
 * - Linear search (slow for large datasets)
 * - No persistence
 * - High memory usage for large datasets
 * 
 * Use for: Development, demos, testing
 * Don't use for: Production with large datasets
 */
export class InMemoryVectorStore implements VectorStore {
  readonly name = "in-memory";

  private documents: Map<string, VectorDocument> = new Map();

  async add(document: VectorDocument): Promise<void> {
    this.documents.set(document.id, document);
  }

  async addBatch(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      this.documents.set(doc.id, doc);
    }
  }

  async search(
    queryEmbedding: EmbeddingVector,
    limit: number = 5,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Calculate similarity for each document
    for (const doc of Array.from(this.documents.values())) {
      // Apply metadata filter if provided
      if (filter) {
        let matches = true;
        for (const [key, value] of Object.entries(filter)) {
          if (doc.metadata[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      // Calculate similarity
      const score = cosineSimilarity(queryEmbedding, doc.embedding);

      results.push({ document: doc, score });
    }

    // Sort by score (highest first) and limit results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    const toDelete: string[] = [];

    for (const [id, doc] of Array.from(this.documents.entries())) {
      if (doc.metadata.documentId === documentId) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.documents.delete(id);
    }
  }

  async count(): Promise<number> {
    return this.documents.size;
  }

  async clear(): Promise<void> {
    this.documents.clear();
  }

  /**
   * Get all documents (for debugging/inspection)
   */
  getAllDocuments(): VectorDocument[] {
    return Array.from(this.documents.values());
  }
}

/**
 * Vector store factory
 */
export type VectorStoreType = "in-memory" | "pinecone" | "weaviate";

export interface VectorStoreConfig {
  type: VectorStoreType;
  apiKey?: string; // Required for cloud providers
  environment?: string; // For Pinecone
  indexName?: string; // For Pinecone/Weaviate
}

/**
 * Create a vector store instance
 * 
 * @param config - Store configuration
 * @returns Configured vector store
 */
export function createVectorStore(config: VectorStoreConfig): VectorStore {
  switch (config.type) {
    case "in-memory":
      return new InMemoryVectorStore();

    case "pinecone":
      throw new Error(
        "Pinecone vector store not yet implemented. Use in-memory store for now."
      );

    case "weaviate":
      throw new Error(
        "Weaviate vector store not yet implemented. Use in-memory store for now."
      );

    default:
      throw new Error(`Unknown vector store type: ${config.type}`);
  }
}

/**
 * Default vector store (in-memory)
 */
let defaultStore: VectorStore | null = null;

/**
 * Get or create the default vector store
 */
export function getDefaultVectorStore(): VectorStore {
  if (!defaultStore) {
    defaultStore = createVectorStore({ type: "in-memory" });
  }
  return defaultStore;
}
