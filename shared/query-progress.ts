/**
 * Query Generation Progress Types
 * Shared between server and client for real-time progress updates
 */

export enum QueryProgressStage {
    STARTED = "started",
    RAG_SEARCH = "rag_search",
    KEYWORD_FALLBACK = "keyword_fallback",
    RELATIONSHIP_DISCOVERY = "relationship_discovery",
    CONTEXT_BUILDING = "context_building",
    PROMPT_BUILDING = "prompt_building",
    LLM_REQUEST = "llm_request",
    LLM_WAITING = "llm_waiting",
    LLM_RESPONSE = "llm_response",
    PARSING = "parsing",
    COMPLETED = "completed",
    ERROR = "error",
}

export interface QueryProgressUpdate {
    sessionId: string;
    stage: QueryProgressStage;
    progress: number; // 0-100
    message: string;
    timestamp: number;
    details?: {
        tablesFound?: number;
        relationshipsFound?: number;
        llmElapsedMs?: number;
        totalElapsedMs?: number;
    };
}

export const STAGE_PROGRESS: Record<QueryProgressStage, number> = {
    [QueryProgressStage.STARTED]: 0,
    [QueryProgressStage.RAG_SEARCH]: 10,
    [QueryProgressStage.KEYWORD_FALLBACK]: 15,
    [QueryProgressStage.RELATIONSHIP_DISCOVERY]: 25,
    [QueryProgressStage.CONTEXT_BUILDING]: 35,
    [QueryProgressStage.PROMPT_BUILDING]: 45,
    [QueryProgressStage.LLM_REQUEST]: 50,
    [QueryProgressStage.LLM_WAITING]: 55,
    [QueryProgressStage.LLM_RESPONSE]: 90,
    [QueryProgressStage.PARSING]: 95,
    [QueryProgressStage.COMPLETED]: 100,
    [QueryProgressStage.ERROR]: 100,
};

export const STAGE_LABELS: Record<QueryProgressStage, string> = {
    [QueryProgressStage.STARTED]: "Starting query generation...",
    [QueryProgressStage.RAG_SEARCH]: "Searching relevant tables with RAG...",
    [QueryProgressStage.KEYWORD_FALLBACK]: "Finding tables via keywords...",
    [QueryProgressStage.RELATIONSHIP_DISCOVERY]: "Discovering table relationships...",
    [QueryProgressStage.CONTEXT_BUILDING]: "Building schema context...",
    [QueryProgressStage.PROMPT_BUILDING]: "Preparing LLM prompt...",
    [QueryProgressStage.LLM_REQUEST]: "Sending request to AI...",
    [QueryProgressStage.LLM_WAITING]: "Waiting for AI response...",
    [QueryProgressStage.LLM_RESPONSE]: "Processing AI response...",
    [QueryProgressStage.PARSING]: "Parsing and validating SQL...",
    [QueryProgressStage.COMPLETED]: "Query generated successfully!",
    [QueryProgressStage.ERROR]: "Error occurred",
};
