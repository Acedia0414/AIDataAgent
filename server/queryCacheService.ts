import { getDb } from './db';
import { queryHistory } from '../drizzle/schema';
import { eq, desc, like, or, and } from 'drizzle-orm';
import { ENV } from './_core/env';

/**
 * Query Cache Service - Intelligently match similar queries
 */
export class QueryCacheService {
  private static instance: QueryCacheService;
  
  // Cache configuration
  private readonly successThreshold: number;
  private readonly failureThreshold: number;
  private readonly maxEntriesPerUser: number;
  private readonly enableLearning: boolean;
  
  static getInstance(): QueryCacheService {
    if (!QueryCacheService.instance) {
      QueryCacheService.instance = new QueryCacheService();
    }
    return QueryCacheService.instance;
  }

  constructor() {
    // Read configuration from environment variables with default values
    this.successThreshold = parseFloat(process.env.CACHE_SUCCESS_THRESHOLD || '0.7');
    this.failureThreshold = parseFloat(process.env.CACHE_FAILURE_THRESHOLD || '0.8');
    this.maxEntriesPerUser = parseInt(process.env.MAX_CACHE_ENTRIES_PER_USER || '100', 10);
    this.enableLearning = process.env.ENABLE_CACHE_LEARNING !== 'false';
    
    console.log(`[Query Cache] 🎛️ Config: success=${this.successThreshold}, failure=${this.failureThreshold}, maxEntries=${this.maxEntriesPerUser}, learning=${this.enableLearning}`);
  }

  /**
   * Find similar historical queries
   * Use keyword matching + execution status filtering
   */
  async findSimilarQueries(userQuery: string, userId: number, limit: number = 5): Promise<Array<{
    naturalQuery: string;
    generatedSql: string;
    similarity: number;
    executionStatus: string;
    rowCount: number;
    executionTime: number;
  }>> {
    const db = await getDb();
    if (!db) return [];

    // Extract keywords
    const keywords = this.extractKeywords(userQuery);
    
    // Build query conditions
    const conditions = [];
    for (const keyword of keywords) {
      if (keyword.length > 2) { // Only match meaningful keywords
        conditions.push(
          like(queryHistory.naturalLanguageQuery, `%${keyword}%`)
        );
      }
    }

    if (conditions.length === 0) {
      // If no valid keywords, return empty
      return [];
    }

    // Query similar successful queries (priority) and recent failed queries (for learning)
    const similarQueries = await db
      .select({
        naturalQuery: queryHistory.naturalLanguageQuery,
        generatedSql: queryHistory.generatedSql,
        executionStatus: queryHistory.executionStatus,
        rowCount: queryHistory.rowCount,
        executionTime: queryHistory.executionTime,
        createdAt: queryHistory.createdAt,
      })
      .from(queryHistory)
      .where(
        and(
          or(...conditions),
          eq(queryHistory.userId, userId)
        )
      )
      .orderBy(desc(queryHistory.createdAt))
      .limit(limit * 3); // Get more candidates for filtering

    // Calculate similarity scores and classify
    const scoredQueries = similarQueries.map(query => ({
      naturalQuery: query.naturalQuery,
      generatedSql: query.generatedSql,
      similarity: this.calculateSimilarity(userQuery, query.naturalQuery),
      executionStatus: query.executionStatus,
      rowCount: query.rowCount || 0,
      executionTime: query.executionTime || 0,
    }));

    // Prioritize successful queries, reduce weight for failed queries
    const weightedQueries = scoredQueries.map(q => ({
      ...q,
      adjustedSimilarity: q.executionStatus === 'success' 
        ? q.similarity 
        : q.similarity * 0.3 // Failed query weight reduced by 70%
    }));

    // Sort by adjusted similarity using configured threshold
    return weightedQueries
      .filter(q => q.adjustedSimilarity > 0.2) // Basic threshold
      .sort((a, b) => b.adjustedSimilarity - a.adjustedSimilarity)
      .slice(0, limit);
  }

  /**
   * Get best matching cached query
   * Prioritize successful queries, only consider failed queries if no successful ones
   */
  async getBestCachedQuery(userQuery: string, userId: number): Promise<{
    naturalQuery: string;
    generatedSql: string;
    similarity: number;
    executionStatus: string;
  } | null> {
    const similarQueries = await this.findSimilarQueries(userQuery, userId, 1);
    
    if (similarQueries.length === 0) {
      return null;
    }

    const bestMatch = similarQueries[0];
    
    // If failed query with low similarity, return null to let system regenerate
    if (bestMatch.executionStatus !== 'success' && bestMatch.similarity < this.failureThreshold) {
      console.log(`[Query Cache] ⚠️ Found failed query with low similarity (${(bestMatch.similarity * 100).toFixed(1)}% < ${(this.failureThreshold * 100).toFixed(1)}%), will regenerate`);
      return null;
    }

    // If successful query but similarity not high enough, also regenerate
    if (bestMatch.executionStatus === 'success' && bestMatch.similarity < this.successThreshold) {
      console.log(`[Query Cache] ⚠️ Found success query with low similarity (${(bestMatch.similarity * 100).toFixed(1)}% < ${(this.successThreshold * 100).toFixed(1)}%), will regenerate`);
      return null;
    }

    return {
      naturalQuery: bestMatch.naturalQuery,
      generatedSql: bestMatch.generatedSql,
      similarity: bestMatch.similarity,
      executionStatus: bestMatch.executionStatus
    };
  }

  /**
   * 提取查询关键词
   */
  private extractKeywords(query: string): string[] {
    // Remove common stop words, extract meaningful business terms
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 
      'in', 'with', 'for', 'of', 'to', 'by', 'from', 'as', 'are', 'was',
      'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'can', 'what', 'when',
      'where', 'how', 'why', 'show', 'me', 'give', 'get', 'find', 'list'
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/) // Tokenize
      .filter(word => 
        word.length > 2 && // At least 3 characters
        !stopWords.has(word) && // Not stop word
        !/^\d+$/.test(word) // Not pure numbers
      );
  }

  /**
   * Calculate similarity between two queries
   * Use Jaccard similarity + keyword weights
   */
  private calculateSimilarity(query1: string, query2: string): number {
    const keywords1 = new Set(this.extractKeywords(query1));
    const keywords2 = new Set(this.extractKeywords(query2));

    if (keywords1.size === 0 || keywords2.size === 0) {
      return 0;
    }

    // Jaccard similarity
    const intersection = new Set(Array.from(keywords1).filter(x => keywords2.has(x)));
    const union = new Set(Array.from(keywords1).concat(Array.from(keywords2)));
    const jaccardSimilarity = intersection.size / union.size;

    // Business term weighting
    const businessTerms = new Set([
      'vendor', 'customer', 'invoice', 'order', 'purchase', 'sales',
      'product', 'item', 'inventory', 'account', 'payment', 'receipt',
      'journal', 'ledger', 'table', 'line', 'header', 'status', 'amount',
      'date', 'time', 'company', 'business', 'unit', 'group', 'code'
    ]);

    const businessIntersection = new Set(
      Array.from(intersection).filter(x => businessTerms.has(x))
    );
    const businessBonus = businessIntersection.size * 0.1;

    // Overall similarity score
    return Math.min(1, jaccardSimilarity + businessBonus);
  }

  /**
   * Intelligently save query to cache
   * Decide whether to save based on execution status
   */
  async saveQuery(
    userId: number,
    naturalQuery: string,
    generatedSql: string,
    executionStatus: 'success' | 'error' | 'pending',
    executionTime?: number,
    rowCount?: number,
    errorMessage?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    // Check if learning feature is enabled
    if (!this.enableLearning && executionStatus === 'error') {
      console.log(`[Query Cache] ℹ️ Cache learning disabled, skipping failed query save`);
      return;
    }

    // For failed queries, check if similar failed queries already exist
    if (executionStatus === 'error') {
      const similarFailed = await this.findSimilarFailedQueries(naturalQuery, userId, 1);
      if (similarFailed.length > 0) {
        console.log(`[Query Cache] ℹ️ Similar failed query already exists, skipping save`);
        return; // Avoid duplicate saving of similar failed queries
      }
    }

    // Check user cache entry limit
    if (this.maxEntriesPerUser > 0) {
      await this.enforceUserCacheLimit(userId);
    }

    try {
      await db.insert(queryHistory).values({
        userId,
        naturalLanguageQuery: naturalQuery,
        generatedSql: generatedSql,
        executionStatus,
        executionTime,
        rowCount,
        errorMessage,
      });
      
      console.log(`[Query Cache] 💾 Saved query (${executionStatus}): ${naturalQuery.substring(0, 50)}...`);
    } catch (error) {
      console.warn('[Query Cache] Failed to save query:', error);
    }
  }

  /**
   * Clear all cache entries for a specific user
   */
  async clearUserCache(userId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await db
        .delete(queryHistory)
        .where(eq(queryHistory.userId, userId));
      
      console.log(`[Query Cache] 🗑️ Cleared all cache entries for user ${userId}`);
    } catch (error) {
      console.warn('[Query Cache] Failed to clear user cache:', error);
    }
  }

  /**
   * Clear specific cache entry by query
   */
  async clearSpecificCache(userId: number, userQuery: string): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await db
        .delete(queryHistory)
        .where(and(
          eq(queryHistory.userId, userId),
          like(queryHistory.naturalLanguageQuery, `%${userQuery.substring(0, 50)}%`)
        ));
      
      console.log(`[Query Cache] 🗑️ Cleared cache entry for query: ${userQuery.substring(0, 50)}...`);
    } catch (error) {
      console.warn('[Query Cache] Failed to clear specific cache:', error);
    }
  }

  /**
   * Enforce user cache entry limit
   */
  private async enforceUserCacheLimit(userId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      // Get user's current cache entry count
      const userQueries = await db
        .select({ id: queryHistory.id })
        .from(queryHistory)
        .where(eq(queryHistory.userId, userId))
        .orderBy(desc(queryHistory.createdAt));

      if (userQueries.length >= this.maxEntriesPerUser) {
        // Delete oldest entries, keep newest
        const excessCount = userQueries.length - this.maxEntriesPerUser + 1;
        const oldestIds = userQueries.slice(-excessCount).map(q => q.id);
        
        if (oldestIds.length > 0) {
          await db
            .delete(queryHistory)
            .where(and(
              eq(queryHistory.userId, userId),
              eq(queryHistory.id, oldestIds[0])
            )); // Delete the oldest one
          
          console.log(`[Query Cache] 🗑️ Removed oldest cache entry for user ${userId} (limit: ${this.maxEntriesPerUser})`);
        }
      }
    } catch (error) {
      console.warn('[Query Cache] Failed to enforce cache limit:', error);
    }
  }

  /**
   * Find similar failed queries (to avoid duplicate saving)
   */
  private async findSimilarFailedQueries(userQuery: string, userId: number, limit: number = 3): Promise<Array<{
    naturalQuery: string;
    generatedSql: string;
    similarity: number;
  }>> {
    const db = await getDb();
    if (!db) return [];

    const keywords = this.extractKeywords(userQuery);
    const conditions = [];
    
    for (const keyword of keywords) {
      if (keyword.length > 2) {
        conditions.push(like(queryHistory.naturalLanguageQuery, `%${keyword}%`));
      }
    }

    if (conditions.length === 0) return [];

    const similarQueries = await db
      .select({
        naturalQuery: queryHistory.naturalLanguageQuery,
        generatedSql: queryHistory.generatedSql,
      })
      .from(queryHistory)
      .where(
        and(
          or(...conditions),
          eq(queryHistory.executionStatus, 'error'),
          eq(queryHistory.userId, userId)
        )
      )
      .orderBy(desc(queryHistory.createdAt))
      .limit(limit);

    return similarQueries
      .map(query => ({
        naturalQuery: query.naturalQuery,
        generatedSql: query.generatedSql,
        similarity: this.calculateSimilarity(userQuery, query.naturalQuery)
      }))
      .filter(q => q.similarity > 0.7) // Only find failed queries with high similarity
      .sort((a, b) => b.similarity - a.similarity);
  }
}

// Export singleton instance
export const queryCacheService = QueryCacheService.getInstance();
