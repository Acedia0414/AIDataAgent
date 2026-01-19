/**
 * Intent Classification System
 *
 * Classifies user requests into three categories:
 * 1. GENERAL_QA: General questions that don't require database queries
 * 2. QUERY_REQUIRED: Questions that need SQL query execution
 * 3. FILE_GENERATION: Questions that require query execution + file generation (Excel, etc.)
 *
 * Uses LLM to analyze the user's intent based on keywords and context.
 */

import { invokeLLM } from "./_core/llm";
import {
  INTENT_CLASSIFIER_SYSTEM_PROMPT,
  getIntentClassificationPrompt,
} from "./llm-prompts";

/**
 * Intent types for user requests
 */
export type IntentType = "GENERAL_QA" | "QUERY_REQUIRED" | "FILE_GENERATION";

/**
 * Intent classification result
 */
export interface IntentClassification {
  intent: IntentType;
  confidence: number; // 0-1 scale
  reasoning: string;
  requiresDatabase: boolean;
  requiresFileGeneration: boolean;
  suggestedFileTypes?: string[]; // e.g., ["excel", "csv", "pdf"]
  isMultiStep?: boolean; // Indicates if query requires multiple steps
  multiStepHint?: string; // Hint about multi-step nature
}

/**
 * Classify user intent using LLM
 *
 * @param userMessage - The user's natural language request
 * @param conversationHistory - Previous messages for context (optional)
 * @returns Intent classification with confidence and reasoning
 */
export async function classifyIntent(
  userMessage: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<IntentClassification> {
  // Build context from conversation history
  const historyContext = conversationHistory
    ? conversationHistory.slice(-5).map((msg) => `${msg.role}: ${msg.content}`).join("\n")
    : undefined;

  // Create classification prompt using centralized configuration
  const classificationPrompt = getIntentClassificationPrompt({
    userMessage,
    historyContext,
  });

  try {
    // Call LLM for classification
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: INTENT_CLASSIFIER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: classificationPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: ["GENERAL_QA", "QUERY_REQUIRED", "FILE_GENERATION"],
                description: "The classified intent type",
              },
              confidence: {
                type: "number",
                description: "Confidence score between 0 and 1",
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of the classification",
              },
              requiresDatabase: {
                type: "boolean",
                description: "Whether this request requires database access",
              },
              requiresFileGeneration: {
                type: "boolean",
                description: "Whether this request requires file generation",
              },
              suggestedFileTypes: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "Suggested file types if file generation is required",
              },
              isMultiStep: {
                type: "boolean",
                description: "Whether this request requires multiple query steps",
              },
              multiStepHint: {
                type: "string",
                description: "Brief description of multi-step nature",
              },
            },
            required: [
              "intent",
              "confidence",
              "reasoning",
              "requiresDatabase",
              "requiresFileGeneration",
              "suggestedFileTypes",
              "isMultiStep",
              "multiStepHint",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    // Parse LLM response
    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      throw new Error("Expected string content from LLM response");
    }
    const classification: IntentClassification = JSON.parse(content);

    // Validate classification
    if (!["GENERAL_QA", "QUERY_REQUIRED", "FILE_GENERATION"].includes(classification.intent)) {
      throw new Error(`Invalid intent type: ${classification.intent}`);
    }

    return classification;
  } catch (error) {
    console.error("Intent classification error:", error);

    // Fallback to keyword-based classification
    return fallbackClassification(userMessage);
  }
}

/**
 * Fallback classification using keyword matching
 * Used when LLM classification fails
 */
function fallbackClassification(userMessage: string): IntentClassification {
  const lowerMessage = userMessage.toLowerCase();

  // File generation keywords
  const fileKeywords = [
    "export",
    "download",
    "generate",
    "create",
    "excel",
    "spreadsheet",
    "report",
    "csv",
    "pdf",
    "file",
  ];

  // Query keywords
  const queryKeywords = [
    "show",
    "list",
    "find",
    "get",
    "retrieve",
    "fetch",
    "select",
    "query",
    "search",
    "filter",
    "where",
    "from",
    "table",
    "data",
    "records",
    "rows",
  ];

  // General Q&A keywords
  const qaKeywords = [
    "what is",
    "what does",
    "explain",
    "describe",
    "how does",
    "why",
    "meaning",
    "purpose",
    "definition",
    "concept",
  ];

  // Check for file generation intent
  const hasFileKeywords = fileKeywords.some((keyword) => lowerMessage.includes(keyword));
  if (hasFileKeywords) {
    return {
      intent: "FILE_GENERATION",
      confidence: 0.7,
      reasoning: "Detected file generation keywords (fallback classification)",
      requiresDatabase: true,
      requiresFileGeneration: true,
      suggestedFileTypes: ["excel"],
    };
  }

  // Check for query intent
  const hasQueryKeywords = queryKeywords.some((keyword) => lowerMessage.includes(keyword));
  if (hasQueryKeywords) {
    return {
      intent: "QUERY_REQUIRED",
      confidence: 0.7,
      reasoning: "Detected query keywords (fallback classification)",
      requiresDatabase: true,
      requiresFileGeneration: false,
    };
  }

  // Check for Q&A intent
  const hasQAKeywords = qaKeywords.some((keyword) => lowerMessage.includes(keyword));
  if (hasQAKeywords) {
    return {
      intent: "GENERAL_QA",
      confidence: 0.7,
      reasoning: "Detected Q&A keywords (fallback classification)",
      requiresDatabase: false,
      requiresFileGeneration: false,
    };
  }

  // Default to QUERY_REQUIRED if uncertain
  return {
    intent: "QUERY_REQUIRED",
    confidence: 0.5,
    reasoning: "Uncertain intent, defaulting to query (fallback classification)",
    requiresDatabase: true,
    requiresFileGeneration: false,
  };
}

/**
 * Quick check if a request likely needs database access
 * Useful for early validation before full classification
 */
export function quickDatabaseCheck(userMessage: string): boolean {
  const lowerMessage = userMessage.toLowerCase();

  const databaseIndicators = [
    "show",
    "list",
    "find",
    "get",
    "retrieve",
    "fetch",
    "select",
    "query",
    "search",
    "filter",
    "export",
    "generate",
    "create",
    "report",
    "data",
    "records",
    "table",
    "customer",
    "vendor",
    "order",
    "invoice",
    "payment",
  ];

  return databaseIndicators.some((indicator) => lowerMessage.includes(indicator));
}
