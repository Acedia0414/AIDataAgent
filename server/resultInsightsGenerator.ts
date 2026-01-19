import { invokeLLM } from "./_core/llm";
import {
  RESULT_INSIGHTS_SYSTEM_PROMPT,
  getResultInsightsPrompt,
} from "./llm-prompts";

export interface QueryResultInsights {
  summary: string;
  keyFindings: string[];
  patterns: string[];
  anomalies: string[];
  statistics: {
    label: string;
    value: string;
  }[];
  recommendations?: string[];
}

/**
 * Generate AI-powered insights from query results
 * Analyzes data to identify patterns, anomalies, and key statistics
 */
export async function generateResultInsights(
  originalQuestion: string,
  sql: string,
  results: any[],
  rowCount: number
): Promise<QueryResultInsights> {
  try {
    // Prepare data sample for analysis (limit to first 100 rows to avoid token limits)
    const sampleSize = Math.min(results.length, 100);
    const sampleData = results.slice(0, sampleSize);

    // Extract column names and types
    const columns = results.length > 0 ? Object.keys(results[0]) : [];

    // Build analysis prompt using centralized configuration
    const analysisPrompt = getResultInsightsPrompt({
      originalQuestion,
      sql,
      rowCount,
      sampleSize,
      columns,
      sampleData,
    });

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: RESULT_INSIGHTS_SYSTEM_PROMPT,
        },
        { role: "user", content: analysisPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "query_insights",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Brief summary of the data" },
              keyFindings: {
                type: "array",
                items: { type: "string" },
                description: "Key observations from the data",
              },
              patterns: {
                type: "array",
                items: { type: "string" },
                description: "Patterns identified in the data",
              },
              anomalies: {
                type: "array",
                items: { type: "string" },
                description: "Unusual or unexpected values",
              },
              statistics: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    value: { type: "string" },
                  },
                  required: ["label", "value"],
                  additionalProperties: false,
                },
                description: "Relevant statistics from the data",
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
                description: "Actionable recommendations",
              },
            },
            required: ["summary", "keyFindings", "patterns", "anomalies", "statistics"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const insights: QueryResultInsights = JSON.parse(contentStr);

    return insights;
  } catch (error) {
    console.error("Error generating result insights:", error);

    // Return basic insights on error
    return {
      summary: `Query returned ${rowCount} rows.`,
      keyFindings: [`Total records: ${rowCount}`],
      patterns: [],
      anomalies: [],
      statistics: [
        { label: "Total Rows", value: rowCount.toString() },
        { label: "Columns", value: results.length > 0 ? Object.keys(results[0]).length.toString() : "0" },
      ],
    };
  }
}

/**
 * Generate quick statistics without LLM (faster, for large result sets)
 */
export function generateQuickStatistics(results: any[]): {
  label: string;
  value: string;
}[] {
  if (results.length === 0) {
    return [{ label: "Total Rows", value: "0" }];
  }

  const stats: { label: string; value: string }[] = [
    { label: "Total Rows", value: results.length.toString() },
    { label: "Columns", value: Object.keys(results[0]).length.toString() },
  ];

  // Analyze numeric columns
  const columns = Object.keys(results[0]);
  for (const col of columns) {
    const values = results.map((r) => r[col]).filter((v) => typeof v === "number");

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      stats.push(
        { label: `${col} (Avg)`, value: avg.toFixed(2) },
        { label: `${col} (Min)`, value: min.toString() },
        { label: `${col} (Max)`, value: max.toString() }
      );
    }
  }

  return stats;
}
