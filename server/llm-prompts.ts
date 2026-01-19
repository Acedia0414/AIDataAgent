/**
 * LLM Prompts Configuration
 *
 * This module provides a clean API for accessing LLM prompts.
 * Prompts are loaded from prompts.md, allowing non-technical users to edit them easily.
 *
 * The prompts.md file contains all prompt templates with distinct sections:
 * - ROLE: Who the AI is
 * - TASK: What it needs to do
 * - RULES: How it should behave
 * - SECURITY: Access control considerations
 * - CONTEXT: Dynamic data placeholders
 * - OUTPUT_FORMAT: Expected response format
 */

import {
    getQueryGeneratorPrompt as loadQueryGeneratorPrompt,
    // getIntentClassifierPrompt removed - prompts deleted
    getQueryReviewPrompt as loadQueryReviewPrompt,
    getResultInsightsPrompt as loadResultInsightsPrompt,
    getSystemPrompts,
} from "./prompt-loader";

// ============================================================================
// QUERY GENERATION PROMPTS
// ============================================================================

export interface QueryGeneratorContext {
    metadataContext: string;
    hintsText: string;
    userSecurityRoles: string[];
}

/**
 * System prompt for SQL query generation from natural language
 * Loaded from prompts.md: Section 1. QUERY GENERATOR
 */
export function getQueryGeneratorSystemPrompt(context: QueryGeneratorContext): string {
    return loadQueryGeneratorPrompt(context);
}

// ============================================================================
// INTENT CLASSIFICATION PROMPTS
// ============================================================================

export interface IntentClassificationContext {
    userMessage: string;
    historyContext?: string;
}

/**
 * System prompt for intent classification
 * DEPRECATED: Intent classifier prompts removed - SQL runs on-demand
 * Keeping stub for backward compatibility with intentClassifier.ts
 */
export const INTENT_CLASSIFIER_SYSTEM_PROMPT = "You are an intent classifier. Always respond with valid JSON only.";

/**
 * User prompt for intent classification
 * DEPRECATED: Intent classifier prompts removed - SQL runs on-demand
 */
export function getIntentClassificationPrompt(context: IntentClassificationContext): string {
    // Simplified inline prompt since external files removed
    return `Classify this user request:
"${context.userMessage}"
${context.historyContext ? `\nConversation History:\n${context.historyContext}` : ''}

Respond with JSON: { "intent": "QUERY_REQUIRED", "confidence": 0.9, "reasoning": "...", "requiresDatabase": true, "requiresFileGeneration": false }`;
}

// ============================================================================
// QUERY REVIEW PROMPTS
// ============================================================================

export interface QueryReviewContext {
    sql: string;
    originalQuestion: string;
}

/**
 * System prompt for SQL query review
 * Loaded from prompts.md: Section 3. QUERY REVIEW
 */
export const QUERY_REVIEW_SYSTEM_PROMPT = getSystemPrompts().queryReview;

/**
 * User prompt for query review generation
 * Loaded from prompts.md: Section 3. QUERY REVIEW
 */
export function getQueryReviewPrompt(context: QueryReviewContext): string {
    return loadQueryReviewPrompt(context);
}

// ============================================================================
// RESULT INSIGHTS PROMPTS
// ============================================================================

export interface ResultInsightsContext {
    originalQuestion: string;
    sql: string;
    rowCount: number;
    sampleSize: number;
    columns: string[];
    sampleData: any[];
}

/**
 * System prompt for result insights generation
 * Loaded from prompts.md: Section 4. RESULT INSIGHTS
 */
export const RESULT_INSIGHTS_SYSTEM_PROMPT = getSystemPrompts().resultInsights;

/**
 * User prompt for generating insights from query results
 * Loaded from prompts.md: Section 4. RESULT INSIGHTS
 */
export function getResultInsightsPrompt(context: ResultInsightsContext): string {
    return loadResultInsightsPrompt(context);
}

// ============================================================================
// KNOWLEDGE BASE ADAPTER PROMPTS (Example from comments)
// ============================================================================

export interface KnowledgeBaseContext {
    contextText?: string;
    question: string;
}

/**
 * Example prompt for SQL generation with knowledge base context
 * (Currently commented out in knowledge-base-adapter.ts)
 */
export function getKnowledgeBaseSqlPrompt(context: KnowledgeBaseContext): string {
    return `You are a SQL query generator for Microsoft Dynamics 365 Finance and Operations.

${context.contextText ? `Context from knowledge base:\n${context.contextText}\n` : ''}

User question: ${context.question}

Generate a T-SQL query to answer this question.`;
}

// ============================================================================
// PROMPT TEMPLATES EXPORT
// ============================================================================

/**
 * All available prompt templates
 */
export const LLM_PROMPTS = {
    // Query Generation
    queryGenerator: {
        system: getQueryGeneratorSystemPrompt,
    },

    // Intent Classification
    intentClassifier: {
        system: INTENT_CLASSIFIER_SYSTEM_PROMPT,
        user: getIntentClassificationPrompt,
    },

    // Query Review
    queryReview: {
        system: QUERY_REVIEW_SYSTEM_PROMPT,
        user: getQueryReviewPrompt,
    },

    // Result Insights
    resultInsights: {
        system: RESULT_INSIGHTS_SYSTEM_PROMPT,
        user: getResultInsightsPrompt,
    },

    // Knowledge Base
    knowledgeBase: {
        sqlGeneration: getKnowledgeBaseSqlPrompt,
    },
} as const;

// ============================================================================
// TYPE EXPORTS FOR TYPE SAFETY
// ============================================================================

export type PromptType = keyof typeof LLM_PROMPTS;
