import { invokeLLM } from './_core/llm';
import { queryCacheService } from './queryCacheService';

/**
 * Smart Cache Adapter - Let AI determine if cache is applicable
 */
export class SmartCacheAdapter {
  private static instance: SmartCacheAdapter;
  
  static getInstance(): SmartCacheAdapter {
    if (!SmartCacheAdapter.instance) {
      SmartCacheAdapter.instance = new SmartCacheAdapter();
    }
    return SmartCacheAdapter.instance;
  }

  /**
   * Smart cache retrieval - AI determines if modification needed
   */
  async getSmartCachedQuery(
    userQuery: string, 
    userId: number,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<{
    sql: string;
    explanation: string;
    fromCache: boolean;
    modified: boolean;
    modificationReason?: string;
  } | null> {
    
    // 1. Find similar cache
    const cachedQuery = await queryCacheService.getBestCachedQuery(userQuery, userId);
    if (!cachedQuery) {
      return null;
    }

    console.log(`[Smart Cache] 🎯 Found cache with ${(cachedQuery.similarity * 100).toFixed(1)}% similarity`);

    // 2. Let AI determine if cache is applicable
    const judgmentPrompt = `You are a D365 F&O query expert.

User question: "${userQuery}"

Cached SQL query:
\`\`\`sql
${cachedQuery.generatedSql}
\`\`\`

Original cached query question: "${cachedQuery.naturalQuery}"

Please determine if this cached SQL can answer the user's new question, or if it needs modification.

Return JSON format:
{
  "canUse": true/false,
  "needsModification": true/false,
  "modifiedSql": "Modified SQL (if needed)",
  "reason": "Judgment reason",
  "confidence": "high/medium/low"
}

Judgment criteria:
- If new question is essentially the same as original, use directly
- If only filter conditions are slightly different, modify SQL
- If business requirements are completely different, don't use cache`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: 'system' as const, content: 'You are a D365 F&O query expert, skilled at determining query similarity.' },
          { role: 'user' as const, content: judgmentPrompt }
        ],
        maxTokens: 500
      });

      const judgment = JSON.parse(response.choices[0].message.content as string);

      if (judgment.canUse) {
        if (judgment.needsModification && judgment.modifiedSql) {
          console.log(`[Smart Cache] 🔄 Modified cached SQL: ${judgment.reason}`);
          return {
            sql: judgment.modifiedSql,
            explanation: `Modified based on similar query: ${judgment.reason}`,
            fromCache: true,
            modified: true,
            modificationReason: judgment.reason
          };
        } else {
          console.log(`[Smart Cache] ✅ Using cached SQL directly: ${judgment.reason}`);
          return {
            sql: cachedQuery.generatedSql,
            explanation: `Use historical similar query: ${judgment.reason}`,
            fromCache: true,
            modified: false
          };
        }
      } else {
        console.log(`[Smart Cache] ❌ Cache not suitable: ${judgment.reason}`);
        return null;
      }
    } catch (error) {
      console.warn('[Smart Cache] AI judgment failed, falling back to original cache:', error);
      // Fallback to original cache logic
      return {
        sql: cachedQuery.generatedSql,
        explanation: 'Use similar query (AI judgment failed)',
        fromCache: true,
        modified: false
      };
    }
  }
}

export const smartCacheAdapter = SmartCacheAdapter.getInstance();
