/**
 * Response Case Types
 *
 * Standardized answer structure for query generation:
 * - PerfectAnswer: SQL query that can run directly, no issues
 * - MissingInfo: Needs clarification/additional info from user
 * - WrongAnswer: Not usable (invalid column, logic error, etc.)
 * - Troubleshooting: Security/constraint violations or service issues
 */

/**
 * Base response metadata common to all cases
 */
export interface ResponseMetadata {
    sql?: string;
    explanation: string;
    ragSources?: Array<{ documentId: string; filename: string }>;
    reasoning?: string; // Detailed reasoning for demo/debug
    logSessionId?: string; // Reference to log file
    tablesNeeded?: string[]; // Tables needed for clarification
    clarifyingQuestions?: string[]; // Questions to ask user
    schemaNotes?: string[]; // Schema observations
    assumedSchema?: string[]; // Standard D365 tables assumed using LLM knowledge
    stagedSql?: string; // Best-effort SQL preview
    promptFiles?: string[]; // Prompt files used
    modelInfo?: {
        model: string;
        temperature: number;
        maxTokens: number;
    };
    tokenUsage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCostUsd?: number; // Rough cost estimate
    };
}

/**
 * Perfect Answer Case
 * SQL query that can run directly without issues
 */
export interface PerfectAnswerCase extends ResponseMetadata {
    type: "perfect";
    sql: string;
    explanation: string;
    confidence: "high" | "medium" | "inferred"; // high = direct match, medium = partial schema, inferred = used LLM D365 knowledge
    assumedSchema?: string[]; // For inferred: what standard D365 tables were assumed
    executionPreview?: {
        success: boolean;
        rowCount?: number;
        executionTime?: number;
        columns?: Array<{ name: string; type: string }>;
        sampleData?: any[];
    };
}

/**
 * Missing Info Case
 * Query generation blocked - user needs to provide more information
 */
export interface MissingInfoCase extends ResponseMetadata {
    type: "needs_clarification";
    explanation: string;
    missingDetails: string[]; // What info is missing or ambiguous
    tablesNeeded?: string[]; // Tables that need schema (structured from LLM)
    suggestedQuestions?: string[]; // Suggestions for clarifying questions
    schemaNotes?: string[]; // Observations about limitations in provided schemas
    stagedSql?: string; // Best-effort SQL preview (even if incomplete)
    partialUnderstanding?: {
        whatWeKnow: string;
        whatWeDontKnow: string;
    };
}

/**
 * Wrong Answer Case
 * Query generated but it's not usable due to errors or invalid logic
 */
export interface WrongAnswerCase extends ResponseMetadata {
    type: "wrong_answer";
    sql?: string; // Might have generated SQL, but it won't work
    explanation: string;
    error: string; // The specific error (e.g., "Invalid column name 'RECEIVEDINTOTAL'")
    reason: string; // Why it's wrong (e.g., "Column doesn't exist in table")
    suggestions?: string[]; // How to fix it
    inferredIssue?: {
        type: "invalid_column" | "invalid_table" | "invalid_logic" | "data_access" | "other";
        details: string;
    };
}

/**
 * Troubleshooting Case
 * Issue with service, security, or system constraints
 */
export interface TroubleshootingCase extends ResponseMetadata {
    type: "troubleshooting";
    explanation: string;
    error: string; // The system error message
    issueType:
    | "security_constraint" // e.g., "Only SELECT queries allowed"
    | "permission_denied" // User doesn't have access
    | "service_unavailable" // LLM, database connection, etc.
    | "rate_limit" // API rate limit hit
    | "invalid_config" // Missing configuration
    | "other";
    suggestion?: string; // How to resolve (if applicable)
    canRetry?: boolean; // Whether retrying might help
}

/**
 * Union type for all possible response cases
 */
export type QueryResponseCase =
    | PerfectAnswerCase
    | MissingInfoCase
    | WrongAnswerCase
    | TroubleshootingCase;

/**
 * Helper function to create response cases
 */
export const ResponseCaseFactory = {
    perfect: (
        sql: string,
        explanation: string,
        metadata: Partial<ResponseMetadata> = {},
        confidence: "high" | "medium" | "inferred" = "high",
        assumedSchema?: string[]
    ): PerfectAnswerCase => ({
        type: "perfect",
        sql,
        explanation,
        confidence,
        assumedSchema,
        ...metadata,
    }),

    needsClarification: (
        explanation: string,
        missingDetails: string[],
        metadata: Partial<ResponseMetadata> = {},
        suggestedQuestions?: string[]
    ): MissingInfoCase => ({
        type: "needs_clarification",
        explanation,
        missingDetails,
        suggestedQuestions,
        ...metadata,
    }),

    wrongAnswer: (
        explanation: string,
        error: string,
        reason: string,
        metadata: Partial<ResponseMetadata> = {},
        sql?: string,
        suggestions?: string[]
    ): WrongAnswerCase => ({
        type: "wrong_answer",
        explanation,
        error,
        reason,
        sql,
        suggestions,
        ...metadata,
    }),

    troubleshooting: (
        explanation: string,
        error: string,
        issueType: TroubleshootingCase["issueType"],
        metadata: Partial<ResponseMetadata> = {},
        suggestion?: string,
        canRetry: boolean = true
    ): TroubleshootingCase => ({
        type: "troubleshooting",
        explanation,
        error,
        issueType,
        suggestion,
        canRetry,
        ...metadata,
    }),
};
