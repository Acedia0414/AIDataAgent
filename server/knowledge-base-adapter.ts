/**
 * Knowledge Base Adapter Interface
 * 
 * This interface defines the contract for integrating a knowledge base
 * component into the D365 F&O Data Agent query generation pipeline.
 * 
 * The knowledge base provides domain-specific context to improve SQL
 * query generation accuracy by supplying relevant documents based on
 * the user's natural language question.
 * 
 * Implementation Status: Interface defined, implementation pending
 * Implementation Owner: Separate team (not part of current scope)
 */

/**
 * Represents a document retrieved from the knowledge base
 */
export interface KnowledgeDocument {
  /**
   * Unique identifier for the document
   */
  id: string;

  /**
   * Document title or heading
   */
  title: string;

  /**
   * Full text content of the document
   * This will be injected into the LLM prompt as context
   */
  content: string;

  /**
   * Relevance score from the search algorithm
   * Range: 0.0 (not relevant) to 1.0 (highly relevant)
   */
  relevanceScore: number;

  /**
   * Additional metadata about the document
   * Examples: category, author, created date, tags
   */
  metadata: Record<string, unknown>;
}

/**
 * Knowledge Base Adapter Interface
 * 
 * Implementations of this interface provide access to a knowledge base
 * for retrieving domain-specific context during query generation.
 */
export interface KnowledgeBaseAdapter {
  /**
   * Search the knowledge base for relevant documents
   * 
   * @param query - Natural language search query (typically the user's question)
   * @param options - Optional search parameters
   * @returns Array of relevant documents sorted by relevance score (descending)
   * 
   * @example
   * const docs = await kb.search("customer shipping address", { limit: 5 });
   * // Returns documents about D365 shipping fields, customer address tables, etc.
   */
  search(query: string, options?: SearchOptions): Promise<KnowledgeDocument[]>;

  /**
   * Check if the knowledge base is available and configured
   * 
   * @returns true if KB is enabled and reachable, false otherwise
   * 
   * @example
   * if (kb.isEnabled()) {
   *   const docs = await kb.search(question);
   *   // Use docs as context
   * }
   */
  isEnabled(): boolean;

  /**
   * Get statistics about the knowledge base
   * 
   * @returns Statistics object with document count and other metrics
   * 
   * @example
   * const stats = await kb.getStats();
   * console.log(`KB contains ${stats.documentCount} documents`);
   */
  getStats(): Promise<KnowledgeBaseStats>;
}

/**
 * Optional parameters for knowledge base search
 */
export interface SearchOptions {
  /**
   * Maximum number of documents to return
   * Default: 5
   */
  limit?: number;

  /**
   * Minimum relevance score threshold (0.0 to 1.0)
   * Documents below this score will be filtered out
   * Default: 0.5
   */
  minRelevance?: number;

  /**
   * Filter by document category
   * Example: "shipping", "inventory", "sales"
   */
  category?: string;
}

/**
 * Knowledge base statistics
 */
export interface KnowledgeBaseStats {
  /**
   * Total number of documents in the knowledge base
   */
  documentCount: number;

  /**
   * Last time the knowledge base was updated
   */
  lastUpdated: Date | null;

  /**
   * Storage size in bytes
   */
  storageSize: number;
}

/**
 * Placeholder implementation that returns no results
 * 
 * This implementation is used until the actual knowledge base
 * component is provided by the separate team.
 */
export class PlaceholderKnowledgeBase implements KnowledgeBaseAdapter {
  async search(query: string, options?: SearchOptions): Promise<KnowledgeDocument[]> {
    console.log('[KnowledgeBase] Placeholder: search called with query:', query);
    console.log('[KnowledgeBase] Placeholder: options:', options);
    
    // Return empty array - no knowledge base available yet
    return [];
  }

  isEnabled(): boolean {
    // Knowledge base not yet implemented
    return false;
  }

  async getStats(): Promise<KnowledgeBaseStats> {
    return {
      documentCount: 0,
      lastUpdated: null,
      storageSize: 0,
    };
  }
}

/**
 * Global knowledge base instance
 * 
 * This will be replaced with the actual implementation once
 * the knowledge base component is provided.
 */
export const knowledgeBase: KnowledgeBaseAdapter = new PlaceholderKnowledgeBase();

/**
 * Integration Example: Using Knowledge Base in Query Generation
 * 
 * This example shows how to integrate the knowledge base into
 * the query generation pipeline once it's implemented.
 * 
 * @example
 * import { knowledgeBase } from './knowledge-base-adapter';
 * import { invokeLLM } from './_core/llm';
 * 
 * async function generateQueryWithContext(question: string): Promise<string> {
 *   let contextText = '';
 *   
 *   // Check if knowledge base is available
 *   if (knowledgeBase.isEnabled()) {
 *     // Search for relevant documents
 *     const docs = await knowledgeBase.search(question, {
 *       limit: 3,
 *       minRelevance: 0.7
 *     });
 *     
 *     // Build context from documents
 *     if (docs.length > 0) {
 *       contextText = docs.map(doc => `
 *         Document: ${doc.title}
 *         ${doc.content}
 *       `).join('\n\n');
 *     }
 *   }
 *   
 *   // Generate SQL with knowledge base context
 *   const prompt = `
 *     You are a SQL query generator for Microsoft Dynamics 365 Finance and Operations.
 *     
 *     ${contextText ? `Context from knowledge base:\n${contextText}\n` : ''}
 *     
 *     User question: ${question}
 *     
 *     Generate a T-SQL query to answer this question.
 *   `;
 *   
 *   const response = await invokeLLM({
 *     messages: [{ role: 'user', content: prompt }]
 *   });
 *   
 *   return response.choices[0].message.content;
 * }
 */
