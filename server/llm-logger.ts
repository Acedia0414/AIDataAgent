/**
 * LLM Logger - Detailed logging for LLM interactions
 *
 * Creates timestamped markdown log files in llm-logs/ folder
 * for post-review and debugging of query generation.
 */

import { writeFileSync, mkdirSync, existsSync, appendFileSync } from "fs";
import { join } from "path";

// Configuration
const LOG_DIR = join(process.cwd(), "llm-logs");
const ENABLED = true; // Toggle logging

// Progress stages
export enum QueryStage {
    STARTED = "🚀 STARTED",
    RAG_SEARCH = "🔍 RAG SEARCH",
    KEYWORD_FALLBACK = "📝 KEYWORD FALLBACK",
    RELATIONSHIP_DISCOVERY = "🔗 RELATIONSHIP DISCOVERY",
    CONTEXT_BUILDING = "📊 CONTEXT BUILDING",
    PROMPT_BUILDING = "✍️ PROMPT BUILDING",
    LLM_REQUEST = "📤 LLM REQUEST",
    LLM_WAITING = "⏳ WAITING FOR LLM",
    LLM_RESPONSE = "📥 LLM RESPONSE",
    PARSING = "🔧 PARSING RESPONSE",
    COMPLETED = "✅ COMPLETED",
    ERROR = "❌ ERROR",
}

interface RelationshipInfo {
    sourceTable: string;
    targetTable: string;
    relationType: string;
    foreignKey?: string;
}

interface TableSelectionInfo {
    tableName: string;
    source: "rag" | "keyword" | "relationship";
    score?: number;
    reason?: string;
}

interface LlmCallInfo {
    timestamp: string;
    url: string;
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    userPrompt: string;
    responseTime?: number;
    response?: string;
    error?: string;
    promptFiles?: string[]; // Track which prompt files were used
}

interface QueryLogSession {
    sessionId: string;
    startTime: Date;
    filePath: string;
    userQuery: string;
    stages: Array<{ stage: QueryStage; timestamp: Date; details?: string }>;
    ragResults: TableSelectionInfo[];
    keywordResults: TableSelectionInfo[];
    relationships: RelationshipInfo[];
    finalTables: string[];
    llmCalls: LlmCallInfo[];
    promptFiles: string[]; // All prompt files used in session
    modelInfo?: { model: string; temperature: number; maxTokens: number };
    result?: {
        sql: string;
        explanation: string;
        error?: string;
    };
}

// Active sessions
const activeSessions = new Map<string, QueryLogSession>();

// Progress callbacks for UI/terminal updates
type ProgressCallback = (stage: QueryStage, details?: string, progress?: number) => void;
const progressCallbacks = new Map<string, ProgressCallback>();

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Format timestamp for filename
 */
function formatTimestamp(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

/**
 * Format timestamp for log entries
 */
function formatLogTime(date: Date): string {
    return date.toISOString();
}

/**
 * Ensure log directory exists
 */
function ensureLogDir(): void {
    if (!existsSync(LOG_DIR)) {
        mkdirSync(LOG_DIR, { recursive: true });
        console.log(`[LLM Logger] Created log directory: ${LOG_DIR}`);
    }
}

/**
 * Start a new logging session
 */
export function startLogSession(userQuery: string, progressCallback?: ProgressCallback): string {
    if (!ENABLED) return "";

    ensureLogDir();

    const sessionId = generateSessionId();
    const startTime = new Date();
    const filename = `${formatTimestamp(startTime)}_${sessionId}.log.md`;
    const filePath = join(LOG_DIR, filename);

    const session: QueryLogSession = {
        sessionId,
        startTime,
        filePath,
        userQuery,
        stages: [],
        ragResults: [],
        keywordResults: [],
        relationships: [],
        finalTables: [],
        llmCalls: [],
        promptFiles: [],
    };

    activeSessions.set(sessionId, session);

    if (progressCallback) {
        progressCallbacks.set(sessionId, progressCallback);
    }

    // Write initial header
    const header = `# LLM Query Log

**Session ID**: \`${sessionId}\`
**Timestamp**: ${formatLogTime(startTime)}
**User Query**: "${userQuery}"

---

## Progress Timeline

| Time | Stage | Details |
|------|-------|---------|
`;

    writeFileSync(filePath, header);
    logStage(sessionId, QueryStage.STARTED, `Query: "${userQuery}"`);

    console.log(`[LLM Logger] Session started: ${sessionId}`);
    console.log(`[LLM Logger] Log file: ${filePath}`);

    return sessionId;
}

/**
 * Log a stage transition
 */
export function logStage(sessionId: string, stage: QueryStage, details?: string): void {
    if (!ENABLED || !sessionId) return;

    const session = activeSessions.get(sessionId);
    if (!session) return;

    const timestamp = new Date();
    session.stages.push({ stage, timestamp, details });

    // Append to log file
    const elapsed = ((timestamp.getTime() - session.startTime.getTime()) / 1000).toFixed(2);
    const detailsStr = details ? details.substring(0, 100).replace(/\n/g, " ") : "";
    const line = `| +${elapsed}s | ${stage} | ${detailsStr} |\n`;
    appendFileSync(session.filePath, line);

    // Notify progress callback
    const callback = progressCallbacks.get(sessionId);
    if (callback) {
        callback(stage, details);
    }

    // Console output
    console.log(`[${stage}] ${details || ""}`);
}

/**
 * Log RAG search results
 */
export function logRagResults(sessionId: string, results: Array<{ tableName: string; score: number; reason?: string }>): void {
    if (!ENABLED || !sessionId) return;

    const session = activeSessions.get(sessionId);
    if (!session) return;

    session.ragResults = results.map(r => ({
        tableName: r.tableName,
        source: "rag" as const,
        score: r.score,
        reason: r.reason,
    }));

    // Append section to log
    let section = `
---

## RAG Search Results

Found **${results.length}** tables via semantic search:

| # | Table Name | Score | Reason |
|---|------------|-------|--------|
`;

    results.forEach((r, idx) => {
        section += `| ${idx + 1} | \`${r.tableName}\` | ${r.score?.toFixed(3) || "N/A"} | ${r.reason || ""} |\n`;
    });

    appendFileSync(session.filePath, section);
}

/**
 * Log keyword fallback results
 */
export function logKeywordResults(sessionId: string, results: Array<{ tableName: string; score: number; matchedKeywords?: string[] }>): void {
    if (!ENABLED || !sessionId) return;

    const session = activeSessions.get(sessionId);
    if (!session) return;

    session.keywordResults = results.map(r => ({
        tableName: r.tableName,
        source: "keyword" as const,
        score: r.score,
        reason: r.matchedKeywords?.join(", "),
    }));

    // Append section to log
    let section = `
---

## Keyword Fallback Results

Found **${results.length}** tables via keyword matching:

| # | Table Name | Score | Matched Keywords |
|---|------------|-------|------------------|
`;

    results.forEach((r, idx) => {
        section += `| ${idx + 1} | \`${r.tableName}\` | ${r.score} | ${r.matchedKeywords?.join(", ") || ""} |\n`;
    });

    appendFileSync(session.filePath, section);
}

/**
 * Log relationship discovery
 */
export function logRelationships(sessionId: string, relationships: RelationshipInfo[]): void {
    if (!ENABLED || !sessionId) return;

    const session = activeSessions.get(sessionId);
    if (!session) return;

    session.relationships = relationships;

    // Append section to log
    let section = `
---

## Relationship Discovery

Discovered **${relationships.length}** related tables via foreign key relationships:

| Source Table | → | Target Table | Relationship Type | Foreign Key |
|--------------|---|--------------|-------------------|-------------|
`;

    relationships.forEach(r => {
        section += `| \`${r.sourceTable}\` | → | \`${r.targetTable}\` | ${r.relationType} | ${r.foreignKey || "N/A"} |\n`;
    });

    appendFileSync(session.filePath, section);
}

/**
 * Log final table selection
 */
export function logFinalTables(sessionId: string, tables: string[], totalAvailable: number): void {
    if (!ENABLED || !sessionId) return;

    const session = activeSessions.get(sessionId);
    if (!session) return;

    session.finalTables = tables;

    // Append section to log
    let section = `
---

## Final Table Selection

Selected **${tables.length}** out of **${totalAvailable}** available tables for context:

<details>
<summary>Click to expand table list</summary>

\`\`\`
${tables.join("\n")}
\`\`\`

</details>
`;

    appendFileSync(session.filePath, section);
}

/**
 * Log LLM request (before sending)
 */
export function logLlmRequest(
    sessionId: string,
    url: string,
    model: string,
    temperature: number,
    maxTokens: number,
    systemPrompt: string,
    userPrompt: string,
    promptFiles?: string[]
): void {
    if (!ENABLED || !sessionId) return;

    const session = activeSessions.get(sessionId);
    if (!session) return;

    // Store model info for UI access
    session.modelInfo = { model, temperature, maxTokens };

    // Store prompt files used
    if (promptFiles && promptFiles.length > 0) {
        session.promptFiles = promptFiles;
    }

    const timestamp = formatLogTime(new Date());
    const callInfo: LlmCallInfo = {
        timestamp,
        url,
        model,
        temperature,
        maxTokens,
        systemPrompt,
        userPrompt,
        promptFiles,
    };

    session.llmCalls.push(callInfo);
    const callIndex = session.llmCalls.length;

    // Log prompt files to terminal
    if (promptFiles && promptFiles.length > 0) {
        console.log(`[LLM Logger] Prompt files used: ${promptFiles.join(", ")}`);
    }

    // Append section to log
    let section = `
---

## LLM Call #${callIndex}

**Timestamp**: ${timestamp}
**URL**: \`${url}\`
**Model**: \`${model}\`
**Temperature**: ${temperature}
**Max Tokens**: ${maxTokens}
`;

    // Add prompt files section if available
    if (promptFiles && promptFiles.length > 0) {
        section += `
### Prompt Files Used

${promptFiles.map(f => `- \`prompts/${f}\``).join("\n")}
`;
    }

    section += `
### System Prompt

<details>
<summary>Click to expand (${systemPrompt.length} characters)</summary>

\`\`\`
${systemPrompt}
\`\`\`

</details>

### User Prompt

\`\`\`
${userPrompt}
\`\`\`

`;

    appendFileSync(session.filePath, section);
}

/**
 * Log LLM response
 */
export function logLlmResponse(sessionId: string, responseTime: number, response: string, error?: string): void {
    if (!ENABLED || !sessionId) return;

    const session = activeSessions.get(sessionId);
    if (!session) return;

    // Update the last LLM call with response info
    const lastCall = session.llmCalls[session.llmCalls.length - 1];
    if (lastCall) {
        lastCall.responseTime = responseTime;
        lastCall.response = response;
        lastCall.error = error;
    }

    // Append section to log
    let section = `
### Response

**Response Time**: ${(responseTime / 1000).toFixed(2)} seconds

`;

    if (error) {
        section += `**Error**: ${error}\n`;
    } else {
        section += `<details>
<summary>Click to expand response (${response.length} characters)</summary>

\`\`\`json
${response}
\`\`\`

</details>
`;
    }

    appendFileSync(session.filePath, section);
}

/**
 * Complete the logging session
 * Accepts QueryResponseCase or legacy format
 */
export function completeLogSession(sessionId: string, result: { sql?: string; explanation?: string; error?: string; type?: string }): void {
    if (!ENABLED || !sessionId) return;

    const session = activeSessions.get(sessionId);
    if (!session) return;

    // Handle new QueryResponseCase types
    const isError = result.type === "troubleshooting" || result.type === "wrong_answer";
    const errorMsg = result.error || (isError ? "See response case for details" : undefined);
    const sql = result.sql || "";
    const explanation = result.explanation || "";

    session.result = { sql, explanation, error: errorMsg };
    const endTime = new Date();
    const totalTime = ((endTime.getTime() - session.startTime.getTime()) / 1000).toFixed(2);

    logStage(sessionId, errorMsg ? QueryStage.ERROR : QueryStage.COMPLETED, errorMsg || "Success");

    // Append final summary
    const section = `
---

## Final Result

**Total Time**: ${totalTime} seconds
**Status**: ${errorMsg ? "❌ Failed" : "✅ Success"}
**Response Type**: ${result.type || "legacy"}

${errorMsg ? `### Error\n\n\`\`\`\n${errorMsg}\n\`\`\`` : `### Generated SQL

\`\`\`sql
${sql}
\`\`\`

### Explanation

${explanation}`}

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| RAG Tables Found | ${session.ragResults.length} |
| Keyword Tables Found | ${session.keywordResults.length} |
| Relationships Discovered | ${session.relationships.length} |
| Final Tables Used | ${session.finalTables.length} |
| LLM Calls Made | ${session.llmCalls.length} |
| Total Response Time | ${session.llmCalls.reduce((sum, c) => sum + (c.responseTime || 0), 0) / 1000}s |
| Total Processing Time | ${totalTime}s |
`;

    appendFileSync(session.filePath, section);

    // Cleanup
    activeSessions.delete(sessionId);
    progressCallbacks.delete(sessionId);

    console.log(`[LLM Logger] Session completed: ${session.filePath}`);
}

/**
 * Get active session for progress updates
 */
export function getActiveSession(sessionId: string): QueryLogSession | undefined {
    return activeSessions.get(sessionId);
}

/**
 * Register a progress callback for real-time updates
 */
export function registerProgressCallback(sessionId: string, callback: ProgressCallback): void {
    progressCallbacks.set(sessionId, callback);
}

/**
 * Create a progress tracker for terminal output
 */
export function createTerminalProgressTracker(sessionId: string): ProgressCallback {
    const stages = Object.values(QueryStage);
    let llmStartTime: number | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    return (stage: QueryStage, details?: string, progress?: number) => {
        // Clear any existing interval
        if (intervalId && stage !== QueryStage.LLM_WAITING) {
            clearInterval(intervalId);
            intervalId = null;
        }

        const stageIndex = stages.indexOf(stage);
        const progressPercent = Math.round((stageIndex / (stages.length - 1)) * 100);

        // Terminal progress bar
        const barWidth = 30;
        const filledWidth = Math.round((progressPercent / 100) * barWidth);
        const emptyWidth = barWidth - filledWidth;
        const bar = "█".repeat(filledWidth) + "░".repeat(emptyWidth);

        // Special handling for LLM waiting stage
        if (stage === QueryStage.LLM_REQUEST) {
            llmStartTime = Date.now();
        }

        if (stage === QueryStage.LLM_WAITING && llmStartTime) {
            // Start interval to show elapsed time
            intervalId = setInterval(() => {
                const elapsed = ((Date.now() - llmStartTime!) / 1000).toFixed(1);
                process.stdout.write(`\r[${bar}] ${progressPercent}% | ${stage} | Elapsed: ${elapsed}s    `);
            }, 100);
        } else {
            process.stdout.write(`\r[${bar}] ${progressPercent}% | ${stage}${details ? ` | ${details.substring(0, 40)}` : ""}    \n`);
        }

        if (stage === QueryStage.COMPLETED || stage === QueryStage.ERROR) {
            if (intervalId) {
                clearInterval(intervalId);
            }
            console.log(""); // New line after completion
        }
    };
}

/**
 * Get session metadata for UI display
 */
export function getSessionMetadata(sessionId: string): {
    promptFiles: string[];
    modelInfo?: { model: string; temperature: number; maxTokens: number };
} | undefined {
    const session = activeSessions.get(sessionId);
    if (!session) return undefined;

    return {
        promptFiles: session.promptFiles,
        modelInfo: session.modelInfo,
    };
}

// Export types for use in other modules
export type { RelationshipInfo, TableSelectionInfo, LlmCallInfo, QueryLogSession };
