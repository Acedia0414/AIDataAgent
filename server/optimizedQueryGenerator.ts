import { smartCacheAdapter } from './smartCacheAdapter';
import { metadataOptimizer } from './metadataOptimizer';
import { invokeLLM } from './_core/llm';
import { queryCacheService } from './queryCacheService';

/**
 * Optimized Query Generator - Integrate all optimization strategies
 */
export class OptimizedQueryGenerator {
  private static instance: OptimizedQueryGenerator;
  
  static getInstance(): OptimizedQueryGenerator {
    if (!OptimizedQueryGenerator.instance) {
      OptimizedQueryGenerator.instance = new OptimizedQueryGenerator();
    }
    return OptimizedQueryGenerator.instance;
  }

  /**
   * Generate optimized query - integrate all improvements
   */
  async generateOptimizedQuery(
    userQuery: string,
    userId: number,
    tables: any[],
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<{
    sql: string;
    explanation: string;
    fromCache: boolean;
    tokenOptimization: {
      originalTokens: number;
      optimizedTokens: number;
      saved: number;
      savingPercent: number;
    };
  }> {
    
    console.log(`[Optimized Generator] 🚀 Starting with smart optimizations`);

    // 1. Smart cache check - AI determines if applicable
    const smartCache = await smartCacheAdapter.getSmartCachedQuery(
      userQuery, 
      userId, 
      conversationHistory
    );
    
    if (smartCache) {
      console.log(`[Optimized Generator] 🎯 Smart cache hit! Modified: ${smartCache.modified}`);
      return {
        sql: smartCache.sql,
        explanation: smartCache.explanation,
        fromCache: true,
        tokenOptimization: {
          originalTokens: 8000,
          optimizedTokens: 0,
          saved: 8000,
          savingPercent: 100
        }
      };
    }

    // 2. Optimized metadata context generation
    const optimizedContext = metadataOptimizer.generateOptimizedContext(
      tables, 
      userQuery, 
      'sql-generation'
    );

    // 3. Calculate token optimization effect
    const originalContext = this.generateOriginalContext(tables);
    const originalTokens = this.estimateTokens(originalContext);
    const optimizedTokens = this.estimateTokens(optimizedContext);

    console.log(`[Optimized Generator] 📊 Token optimization: ${originalTokens} → ${optimizedTokens} (${((originalTokens - optimizedTokens) / originalTokens * 100).toFixed(1)}% saved)`);

    // 4. Generate SQL using optimized context
    const systemPrompt = `You are a D365 F&O SQL query expert.

Database: SQL Server (T-SQL syntax)
Rules:
- Use TOP clause (not LIMIT)
- Use GETDATE() to get current date
- Use correct D365 table and field names

${optimizedContext}

User question: "${userQuery}"

生成 SQL 查询来回答这个问题。Return JSON format:
{
  "sql": "SELECT TOP 50 ...",
  "explanation": "Brief explanation",
  "confidence": "high|medium|low"
}`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userQuery }
        ],
        maxTokens: 1500
      });

      const result = JSON.parse(response.choices[0].message.content as string);

      // 5. Save to cache (for future use)
      await queryCacheService.saveQuery(
        userId,
        userQuery,
        result.sql,
        'success',
        0,
        0
      );

      return {
        sql: result.sql,
        explanation: result.explanation,
        fromCache: false,
        tokenOptimization: {
          originalTokens,
          optimizedTokens,
          saved: originalTokens - optimizedTokens,
          savingPercent: ((originalTokens - optimizedTokens) / originalTokens * 100)
        }
      };

    } catch (error) {
      console.error('[Optimized Generator] Query generation failed:', error);
      throw error;
    }
  }

  /**
   * Estimated Token count (rough estimate)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters (English) or 1-2 characters (Chinese)
    const charCount = text.length;
    return Math.ceil(charCount / 3.5); // Take middle value
  }

  /**
   * Generate original metadata context (for comparison)
   */
  private generateOriginalContext(tables: any[]): string {
    let context = "# D365 Finance & Operations Database Schema\n\n";
    
    for (const table of tables) {
      context += `## ${table.tableName}\n`;
      if (table.description) {
        context += `${table.description}\n\n`;
      }
      
      if (table.fields && table.fields.length > 0) {
        context += "Fields:\n";
        for (const field of table.fields) {
          context += `- ${field.fieldName} (${field.fieldType}): ${field.description || ''}\n`;
        }
        context += "\n";
      }
    }
    
    return context;
  }
}

export const optimizedQueryGenerator = OptimizedQueryGenerator.getInstance();
