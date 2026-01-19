/**
 * Enhanced Query Pipeline Orchestrator
 *
 * Manages the complete query execution flow:
 * 1. Intent classification
 * 2. Database connection check
 * 3. Query generation with metadata context
 * 4. Query review (technical + layman explanations)
 * 5. Query execution
 * 6. Result preview (optional)
 * 7. File generation (if needed)
 *
 * ASCII Flow Diagram:
 *
 *     User Request
 *          │
 *          ▼
 *   ┌──────────────┐
 *   │   Classify   │
 *   │    Intent    │
 *   └──────┬───────┘
 *          │
 *     ┌────┴────┐
 *     │         │
 *  General    Query/File
 *   Q&A      Required
 *     │         │
 *     │         ▼
 *     │   ┌──────────┐
 *     │   │  Check   │
 *     │   │   DB     │
 *     │   │  Config  │
 *     │   └────┬─────┘
 *     │        │
 *     │        ▼
 *     │   ┌──────────┐
 *     │   │ Generate │
 *     │   │  Query   │
 *     │   └────┬─────┘
 *     │        │
 *     │        ▼
 *     │   ┌──────────┐
 *     │   │  Review  │
 *     │   │  Query   │
 *     │   └────┬─────┘
 *     │        │
 *     │   ┌────┴────┐
 *     │   │         │
 *     │ Accept   Reject
 *     │   │         │
 *     │   │         └──► Loop back
 *     │   │
 *     │   ▼
 *     │ ┌──────────┐
 *     │ │ Execute  │
 *     │ │  Query   │
 *     │ └────┬─────┘
 *     │      │
 *     │      ▼
 *     │ ┌──────────┐
 *     │ │ Preview? │
 *     │ └────┬─────┘
 *     │      │
 *     │      ▼
 *     │ ┌──────────┐
 *     │ │Generate  │
 *     │ │  Files?  │
 *     │ └────┬─────┘
 *     │      │
 *     └──────┴──────►
 *          │
 *          ▼
 *     Return Response
 */

import { invokeLLM } from "./_core/llm";
import { classifyIntent, IntentClassification } from "./intentClassifier";
import { generateSqlQuery } from "./queryGenerator";
import {
  QUERY_REVIEW_SYSTEM_PROMPT,
  getQueryReviewPrompt,
} from "./llm-prompts";

/**
 * Query review result with technical and layman explanations
 */
export interface QueryReview {
  sql: string;
  technicalExplanation: string;
  laymanExplanation: string;
  estimatedComplexity: "simple" | "moderate" | "complex";
  estimatedExecutionTime: string; // e.g., "< 1 second", "1-5 seconds", "> 5 seconds"
  tablesInvolved: string[];
  potentialIssues?: string[]; // Warnings about performance, missing indexes, etc.
  ragSources?: Array<{ documentId: string; filename: string }>;
}

/**
 * Query execution result with optional preview
 */
export interface QueryExecutionResult {
  success: boolean;
  rowCount: number;
  executionTimeMs: number;
  columns: string[];
  preview?: any[]; // First N rows for preview
  fullResults?: any[]; // All rows if preview not requested
  error?: string;
}

/**
 * Pipeline stage status
 */
export type PipelineStage =
  | "intent_classification"
  | "db_connection_check"
  | "query_generation"
  | "query_review"
  | "query_execution"
  | "result_preview"
  | "file_generation"
  | "completed";

/**
 * Pipeline execution context
 */
export interface PipelineContext {
  userId: number;
  userMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  userSecurityRoles: string[];
  currentStage: PipelineStage;
  intent?: IntentClassification;
  queryReview?: QueryReview;
  executionResult?: QueryExecutionResult;
  error?: string;
}

/**
 * Generate query review with technical and layman explanations
 */
export async function generateQueryReview(
  sql: string,
  originalQuestion: string,
  ragSources?: Array<{ documentId: string; filename: string }>
): Promise<QueryReview> {
  // Generate review prompt using centralized configuration
  const reviewPrompt = getQueryReviewPrompt({
    sql,
    originalQuestion,
  });

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: QUERY_REVIEW_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: reviewPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "query_review",
          strict: true,
          schema: {
            type: "object",
            properties: {
              technicalExplanation: {
                type: "string",
                description: "Technical explanation for developers",
              },
              laymanExplanation: {
                type: "string",
                description: "Simple explanation for business users",
              },
              estimatedComplexity: {
                type: "string",
                enum: ["simple", "moderate", "complex"],
                description: "Query complexity level",
              },
              estimatedExecutionTime: {
                type: "string",
                description: "Estimated execution time",
              },
              tablesInvolved: {
                type: "array",
                items: { type: "string" },
                description: "List of tables used in the query",
              },
              potentialIssues: {
                type: "array",
                items: { type: "string" },
                description: "Potential performance or correctness issues",
              },
            },
            required: [
              "technicalExplanation",
              "laymanExplanation",
              "estimatedComplexity",
              "estimatedExecutionTime",
              "tablesInvolved",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      throw new Error("Expected string content from LLM response");
    }

    const review = JSON.parse(content);

    return {
      sql,
      technicalExplanation: review.technicalExplanation,
      laymanExplanation: review.laymanExplanation,
      estimatedComplexity: review.estimatedComplexity,
      estimatedExecutionTime: review.estimatedExecutionTime,
      tablesInvolved: review.tablesInvolved,
      potentialIssues: review.potentialIssues,
      ragSources,
    };
  } catch (error) {
    console.error("Query review generation error:", error);

    // Fallback review
    const tablesMatch = sql.match(/FROM\s+(\w+)|JOIN\s+(\w+)/gi);
    const tables = tablesMatch
      ? Array.from(new Set(tablesMatch.map((m) => m.replace(/FROM\s+|JOIN\s+/i, "").trim())))
      : [];

    return {
      sql,
      technicalExplanation: `This query retrieves data from ${tables.length} table(s). Review the SQL above for details.`,
      laymanExplanation: `This query will fetch data to answer your question: "${originalQuestion}"`,
      estimatedComplexity: tables.length > 2 ? "complex" : tables.length > 1 ? "moderate" : "simple",
      estimatedExecutionTime: "< 1 second",
      tablesInvolved: tables,
      ragSources,
    };
  }
}

/**
 * Execute query pipeline stage by stage
 * This function is called iteratively as the user progresses through the pipeline
 */
export async function executeQueryPipeline(
  context: PipelineContext
): Promise<PipelineContext> {
  try {
    switch (context.currentStage) {
      case "intent_classification": {
        // Classify user intent
        const intent = await classifyIntent(context.userMessage, context.conversationHistory);
        context.intent = intent;

        // If general Q&A, skip to completion
        if (intent.intent === "GENERAL_QA") {
          context.currentStage = "completed";
        } else {
          // Move to DB connection check
          context.currentStage = "db_connection_check";
        }
        break;
      }

      case "db_connection_check": {
        // This will be checked by the frontend before calling query generation
        // Move to query generation
        context.currentStage = "query_generation";
        break;
      }

      case "query_generation": {
        // Generate SQL query with metadata context
        const queryResult = await generateSqlQuery(
          context.userMessage,
          context.userSecurityRoles,
          context.userId
        );

        // Handle non-perfect cases
        if (queryResult.type !== "perfect") {
          context.error = queryResult.type === "troubleshooting" ? queryResult.error :
            queryResult.type === "wrong_answer" ? queryResult.error :
              "Query requires clarification";
          context.currentStage = "completed";
          break;
        }

        // Generate query review
        const review = await generateQueryReview(
          queryResult.sql,
          context.userMessage,
          queryResult.ragSources
        );

        context.queryReview = review;
        context.currentStage = "query_review";
        break;
      }

      case "query_review": {
        // This stage requires user input (accept/reject)
        // The frontend will handle this and call back with acceptance
        // If rejected, loop back to query_generation with feedback
        break;
      }

      case "query_execution": {
        // Query execution happens in the backend router
        // This stage is managed by the tRPC endpoint
        context.currentStage = "result_preview";
        break;
      }

      case "result_preview": {
        // Preview is optional and managed by frontend
        // Move to file generation if needed
        if (context.intent?.requiresFileGeneration) {
          context.currentStage = "file_generation";
        } else {
          context.currentStage = "completed";
        }
        break;
      }

      case "file_generation": {
        // File generation happens in the backend router
        // This stage is managed by the tRPC endpoint
        context.currentStage = "completed";
        break;
      }

      case "completed": {
        // Pipeline complete
        break;
      }
    }

    return context;
  } catch (error) {
    console.error("Pipeline execution error:", error);
    context.error = error instanceof Error ? error.message : "Unknown pipeline error";
    context.currentStage = "completed";
    return context;
  }
}

/**
 * Create initial pipeline context
 */
export function createPipelineContext(
  userId: number,
  userMessage: string,
  userSecurityRoles: string[],
  conversationHistory?: Array<{ role: string; content: string }>
): PipelineContext {
  return {
    userId,
    userMessage,
    conversationHistory,
    userSecurityRoles,
    currentStage: "intent_classification",
  };
}

/**
 * Format result preview for display
 * Returns first N rows with dynamic column handling
 */
export function formatResultPreview(
  results: any[],
  maxRows: number = 10
): {
  preview: any[];
  totalRows: number;
  columns: string[];
  columnTypes: Record<string, string>;
} {
  if (results.length === 0) {
    return {
      preview: [],
      totalRows: 0,
      columns: [],
      columnTypes: {},
    };
  }

  // Get columns from first row
  const columns = Object.keys(results[0]);

  // Infer column types
  const columnTypes: Record<string, string> = {};
  for (const col of columns) {
    const value = results[0][col];
    if (value === null || value === undefined) {
      columnTypes[col] = "unknown";
    } else if (typeof value === "number") {
      columnTypes[col] = Number.isInteger(value) ? "integer" : "decimal";
    } else if (typeof value === "boolean") {
      columnTypes[col] = "boolean";
    } else if (value instanceof Date) {
      columnTypes[col] = "date";
    } else {
      columnTypes[col] = "string";
    }
  }

  return {
    preview: results.slice(0, maxRows),
    totalRows: results.length,
    columns,
    columnTypes,
  };
}
