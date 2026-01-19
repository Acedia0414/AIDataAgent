/**
 * Prompt Loader Utility
 *
 * Reads prompts from individual markdown files in the prompts/ folder.
 * This allows non-technical users to edit prompts easily - each file contains just the prompt text.
 *
 * Structure:
 * - prompts/query-generator-system.md
 * - prompts/query-generator-rules.md
 * - prompts/query-generator-output.md
 * - ... etc
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Cache for loaded prompts to avoid repeated file reads
const promptsCache = new Map<string, string>();
let lastCheckTime: number = 0;
const CACHE_DURATION = 5000; // 5 seconds

// Track which prompt files were used in the current session
let usedPromptFiles: string[] = [];

/**
 * Clear the list of used prompt files (call at start of each query)
 */
export function resetUsedPromptFiles(): void {
    usedPromptFiles = [];
}

/**
 * Get list of prompt files used in current session
 */
export function getUsedPromptFiles(): string[] {
    return [...usedPromptFiles];
}

/**
 * Load a single prompt file
 */
function loadPromptFile(filename: string): string {
    const now = Date.now();

    // Track that this file was used
    if (!usedPromptFiles.includes(filename)) {
        usedPromptFiles.push(filename);
    }

    // Return cached version if still valid
    if (promptsCache.has(filename) && (now - lastCheckTime) < CACHE_DURATION) {
        return promptsCache.get(filename)!;
    }

    try {
        const filePath = join(process.cwd(), "prompts", filename);

        if (!existsSync(filePath)) {
            console.warn(`[Prompt Loader] File not found: ${filePath}`);
            return "";
        }

        const content = readFileSync(filePath, "utf-8").trim();
        promptsCache.set(filename, content);

        return content;
    } catch (error) {
        console.error(`[Prompt Loader] Failed to load ${filename}:`, error);
        return "";
    }
}

/**
 * Get formatted prompt for query generator
 */
export function getQueryGeneratorPrompt(context: {
    metadataContext: string;
    hintsText: string;
    userSecurityRoles: string[];
}): string {
    const systemPrompt = loadPromptFile("query-generator-system.md");
    const rules = loadPromptFile("query-generator-rules.md");
    const outputFormat = loadPromptFile("query-generator-output.md");

    const parts: string[] = [
        systemPrompt,
        "",
        context.metadataContext,
        "",
        context.hintsText,
        "",
        "Key Rules:",
        rules,
        "",
        "Response format:",
        outputFormat,
    ];

    return parts.filter(p => p !== undefined && p !== "").join("\n");
}

// Intent classifier removed - run-SQL happens on-demand, export-Excel is post-result
// See CHANGELOG.md for details on removed prompts

/**
 * Get formatted prompt for query review
 */
export function getQueryReviewPrompt(context: {
    sql: string;
    originalQuestion: string;
}): string {
    const guidelines = loadPromptFile("query-review-guidelines.md");
    const outputFormat = loadPromptFile("query-review-output.md");

    const parts: string[] = [
        "You are a SQL expert and technical communicator.",
        "",
        guidelines,
        "",
        `Original Question: "${context.originalQuestion}"`,
        "",
        "Generated SQL Query:",
        "```sql",
        context.sql,
        "```",
        "",
        outputFormat,
    ];

    return parts.filter(p => p !== undefined).join("\n");
}

/**
 * Get formatted prompt for result insights
 */
export function getResultInsightsPrompt(context: {
    originalQuestion: string;
    sql: string;
    rowCount: number;
    sampleSize: number;
    columns: string[];
    sampleData: any[];
}): string {
    const requirements = loadPromptFile("result-insights-requirements.md");
    const outputFormat = loadPromptFile("result-insights-output.md");

    const parts: string[] = [
        "You are a data analyst expert. Analyze the following query results and provide insights.",
        "",
        `Original Question: "${context.originalQuestion}"`,
        "",
        "SQL Query:",
        "```sql",
        context.sql,
        "```",
        "",
        "Result Statistics:",
        `- Total rows returned: ${context.rowCount}`,
        `- Sample size analyzed: ${context.sampleSize}`,
        `- Columns: ${context.columns.join(", ")}`,
        "",
        `Sample Data (first ${context.sampleSize} rows):`,
        "```json",
        JSON.stringify(context.sampleData, null, 2),
        "```",
        "",
        requirements,
        "",
        outputFormat,
    ];

    return parts.filter(p => p !== undefined).join("\n");
}

/**
 * Get system prompts
 */
export function getSystemPrompts() {
    return {
        // intentClassifier removed - not used in current flow (run-SQL on-demand)
        queryReview: loadPromptFile("query-review-system.md"),
        resultInsights: loadPromptFile("result-insights-system.md"),
        queryPreflight: loadPromptFile("query-preflight-system.md"),
    };
}

/**
 * Get formatted prompt for query preflight (clarification check)
 */
export function getQueryPreflightPrompt(context: {
    userQuery: string;
    availableTables: string[];
}): string {
    const systemPrompt = loadPromptFile("query-preflight-system.md");
    const rules = loadPromptFile("query-preflight-rules.md");
    const outputFormat = loadPromptFile("query-preflight-output.md");

    const parts: string[] = [
        systemPrompt,
        "",
        rules,
        "",
        `User Query: "${context.userQuery}"`,
        "",
        context.availableTables.length > 0 ? `Available Tables in Schema: ${context.availableTables.slice(0, 50).join(", ")}${context.availableTables.length > 50 ? "..." : ""}` : "",
        "",
        outputFormat,
    ];

    return parts.filter(p => p !== undefined && p !== "").join("\n");
}

/**
 * Clear the cache (useful for development/testing)
 */
export function clearPromptsCache(): void {
    promptsCache.clear();
    lastCheckTime = 0;
}

