/**
 * Query Preflight Service
 *
 * Analyzes user queries before SQL generation to determine if clarification is needed.
 * Uses LLM to understand query intent and identify missing information.
 */

import { invokeLLM } from "./_core/llm";
import { getQueryPreflightPrompt, getSystemPrompts } from "./prompt-loader";
import * as db from "./db";

export interface PreflightQuestion {
    field: string;
    question: string;
    type: "text" | "select" | "date";
    options?: string[];
    required: boolean;
    context: string;
}

export interface PreflightResult {
    status: "READY" | "NEEDS_CLARIFICATION";
    confidence: number;
    questions: PreflightQuestion[];
    inferredContext: {
        tables: string[];
        intent: string;
    };
    error?: string;
}

/**
 * Analyze a user query to determine if it needs clarification before SQL generation
 */
export async function analyzeQueryPreflight(
    userQuery: string
): Promise<PreflightResult> {
    try {
        // Get available tables from metadata
        const tables = await db.getMetadataTables();
        const tableNames = tables.map(t => t.tableName);

        // Build prompt
        const systemPrompt = getSystemPrompts().queryPreflight;
        const userPrompt = getQueryPreflightPrompt({
            userQuery,
            availableTables: tableNames,
        });

        console.log(`[Query Preflight] Analyzing query: "${userQuery.substring(0, 50)}..."`);

        // Call LLM
        const response = await invokeLLM(systemPrompt, userPrompt, {
            temperature: 0.3, // Lower temperature for more consistent analysis
            max_tokens: 1000,
        });

        // Parse response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn("[Query Preflight] Failed to parse LLM response, defaulting to READY");
            return {
                status: "READY",
                confidence: 0.5,
                questions: [],
                inferredContext: { tables: [], intent: userQuery },
            };
        }

        const result = JSON.parse(jsonMatch[0]) as PreflightResult;

        // Validate result structure
        if (!result.status || !["READY", "NEEDS_CLARIFICATION"].includes(result.status)) {
            result.status = "READY";
        }
        result.confidence = Math.max(0, Math.min(1, result.confidence || 0.5));
        result.questions = result.questions || [];
        result.inferredContext = result.inferredContext || { tables: [], intent: userQuery };

        console.log(`[Query Preflight] Result: ${result.status} (confidence: ${result.confidence})`);
        if (result.questions.length > 0) {
            console.log(`[Query Preflight] Questions: ${result.questions.map(q => q.field).join(", ")}`);
        }

        return result;
    } catch (error) {
        console.error("[Query Preflight] Error:", error);
        // On error, default to READY to allow query to proceed
        return {
            status: "READY",
            confidence: 0.5,
            questions: [],
            inferredContext: { tables: [], intent: userQuery },
            error: String(error),
        };
    }
}
