/**
 * Track reasoning for RAG/LLM decisions to show to users
 * This makes the query generation process transparent
 */

export interface RagDecisionReason {
  tableId: number;
  tableName: string;
  similarity: number;
  matchedKeywords: string[];
  isPrimary: boolean;
  primaryKey: string | null;
  rank: number;
}

export interface QueryReasoning {
  intent: string; // "simple_count", "complex_join", "aggregation", etc.
  keywordsDetected: string[];
  ragResults: RagDecisionReason[];
  selectedTables: string[];
  selectedReason: string; // Why we picked these tables
  hints: string[]; // Hints given to LLM (e.g., "Use COUNT(DISTINCT pk)")
  timestamp: number;
}

class ReasoningTracker {
  private currentReasoning: Partial<QueryReasoning> = {};

  reset() {
    this.currentReasoning = {
      timestamp: Date.now(),
    };
  }

  setIntent(intent: string) {
    this.currentReasoning.intent = intent;
  }

  setKeywords(keywords: string[]) {
    this.currentReasoning.keywordsDetected = keywords;
  }

  setRagResults(results: RagDecisionReason[]) {
    this.currentReasoning.ragResults = results;
  }

  setSelectedTables(tables: string[], reason: string) {
    this.currentReasoning.selectedTables = tables;
    this.currentReasoning.selectedReason = reason;
  }

  addHint(hint: string) {
    if (!this.currentReasoning.hints) {
      this.currentReasoning.hints = [];
    }
    this.currentReasoning.hints.push(hint);
  }

  getReasoning(): QueryReasoning | null {
    return this.currentReasoning as QueryReasoning | null;
  }
}

export const reasoningTracker = new ReasoningTracker();

/**
 * Format reasoning for display in chat
 */
export function formatReasoningForChat(reasoning: QueryReasoning): string {
  let output = "**How We Found This:**\n\n";

  // Intent
  if (reasoning.intent) {
    output += `**Query Type:** ${reasoning.intent}\n`;
  }

  // Keywords detected
  if (reasoning.keywordsDetected && reasoning.keywordsDetected.length > 0) {
    output += `**Keywords:** ${reasoning.keywordsDetected.join(", ")}\n`;
  }

  // RAG results summary
  if (reasoning.ragResults && reasoning.ragResults.length > 0) {
    output += `\n**Top Tables Found (by RAG + Keyword Matching):**\n`;
    reasoning.ragResults.slice(0, 5).forEach((r, idx) => {
      const score = (r.similarity * 100).toFixed(0);
      const primary = r.isPrimary ? " [PRIMARY]" : "";
      const keywords = r.matchedKeywords.length > 0 ? ` (matched: ${r.matchedKeywords.join(", ")})` : "";
      output += `${idx + 1}. **${r.tableName}**${primary} - ${score}% match${keywords}\n`;
    });
  }

  // Selected tables
  if (reasoning.selectedTables && reasoning.selectedTables.length > 0) {
    output += `\n**Selected for Query:** ${reasoning.selectedTables.join(", ")}\n`;
    output += `**Why:** ${reasoning.selectedReason}\n`;
  }

  // Hints to LLM
  if (reasoning.hints && reasoning.hints.length > 0) {
    output += `\n**Query Hints:**\n`;
    reasoning.hints.forEach(h => {
      output += `- ${h}\n`;
    });
  }

  return output;
}
