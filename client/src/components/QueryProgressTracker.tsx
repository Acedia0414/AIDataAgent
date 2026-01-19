/**
 * Query Progress Tracker Component
 *
 * Displays real-time progress during query generation with stages:
 * 1. Analyzing tables (RAG/Keyword search)
 * 2. Finding relationships
 * 3. Building context
 * 4. Generating SQL (LLM call)
 * 5. Executing query
 */

import { Loader2, Check, Database, Code, Eye, Play, Link2, FileText, Clock, Cpu } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

export type QueryStage =
  | "analyzing"
  | "relationships"
  | "context"
  | "generating"
  | "reviewing"
  | "executing"
  | "complete"
  | "error";

interface QueryProgressTrackerProps {
  stage: QueryStage;
  error?: string;
  llmElapsedMs?: number; // Current elapsed time during LLM wait
  totalElapsedMs?: number;
  modelInfo?: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd?: number;
  };
  promptFiles?: string[];
  onPromptFileClick?: (filename: string) => void;
  details?: {
    tablesFound?: number;
    relationshipsFound?: number;
  };
}

interface StageInfo {
  id: QueryStage;
  label: string;
  icon: React.ReactNode;
  description: string;
  progress: number;
}

const stages: StageInfo[] = [
  {
    id: "analyzing",
    label: "Analyzing Tables",
    icon: <Database className="h-5 w-5" />,
    description: "Searching relevant tables",
    progress: 10,
  },
  {
    id: "relationships",
    label: "Finding Relationships",
    icon: <Link2 className="h-5 w-5" />,
    description: "Discovering table connections",
    progress: 20,
  },
  {
    id: "context",
    label: "Building Context",
    icon: <FileText className="h-5 w-5" />,
    description: "Preparing for AI",
    progress: 30,
  },
  {
    id: "generating",
    label: "AI Processing",
    icon: <Cpu className="h-5 w-5" />,
    description: "Generating SQL with AI",
    progress: 50,
  },
  {
    id: "reviewing",
    label: "Reviewing Query",
    icon: <Eye className="h-5 w-5" />,
    description: "Validating results",
    progress: 85,
  },
  {
    id: "executing",
    label: "Executing Query",
    icon: <Play className="h-5 w-5" />,
    description: "Running against database",
    progress: 95,
  },
];

export function QueryProgressTracker({
  stage,
  error,
  llmElapsedMs,
  totalElapsedMs,
  modelInfo,
  tokenUsage,
  promptFiles,
  onPromptFileClick,
  details
}: QueryProgressTrackerProps) {
  const currentStageIndex = stages.findIndex((s) => s.id === stage);
  const currentProgress = stage === "complete" ? 100 : (stages[currentStageIndex]?.progress || 0);

  // Animated elapsed time for LLM stage
  const [displayElapsed, setDisplayElapsed] = useState(0);

  useEffect(() => {
    if (stage === "generating" && !llmElapsedMs) {
      // Start counter when entering generating stage
      const startTime = Date.now();
      const interval = setInterval(() => {
        setDisplayElapsed(Date.now() - startTime);
      }, 100);
      return () => clearInterval(interval);
    } else if (llmElapsedMs) {
      setDisplayElapsed(llmElapsedMs);
    }
  }, [stage, llmElapsedMs]);

  return (
    <Card className="p-6 bg-white border">
      {/* Model Info Badge */}
      {modelInfo && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
            {modelInfo.model}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
            temp: {modelInfo.temperature}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
            max: {modelInfo.maxTokens}
          </span>
        </div>
      )}

      {/* Token Usage & Cost */}
      {tokenUsage && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            📊 {tokenUsage.promptTokens.toLocaleString()} in
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            {tokenUsage.completionTokens.toLocaleString()} out
          </span>
          {tokenUsage.estimatedCostUsd !== undefined && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
              💵 ~${tokenUsage.estimatedCostUsd.toFixed(4)}
            </span>
          )}
        </div>
      )}

      {/* Prompt Files Used */}
      {promptFiles && promptFiles.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">Prompt Files:</div>
          <div className="flex flex-wrap gap-1">
            {promptFiles.map((file) => (
              <button
                key={file}
                onClick={() => onPromptFileClick?.(file)}
                className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors cursor-pointer"
                title={`Click to view prompts/${file}`}
              >
                📄 {file}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Query Progress
          </span>
          <span className="text-sm text-gray-500">
            {currentProgress}%
            {totalElapsedMs && ` • ${(totalElapsedMs / 1000).toFixed(1)}s total`}
          </span>
        </div>
        <Progress value={currentProgress} className="h-2" />
      </div>

      <div className="space-y-4">
        {stages.map((stageInfo, index) => {
          const isComplete = index < currentStageIndex || stage === "complete";
          const isCurrent = index === currentStageIndex && stage !== "complete" && !error;
          const isPending = index > currentStageIndex && stage !== "complete";

          // Show LLM elapsed time for generating stage
          const showElapsed = stageInfo.id === "generating" && isCurrent;

          return (
            <div
              key={stageInfo.id}
              className={cn(
                "flex items-start gap-4 transition-opacity",
                isPending && "opacity-40"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  isComplete && "bg-green-100 text-green-600",
                  isCurrent && "bg-blue-100 text-blue-600 animate-pulse shadow-lg shadow-blue-200",
                  isPending && "bg-gray-100 text-gray-400"
                )}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  stageInfo.icon
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4
                  className={cn(
                    "font-medium transition-colors",
                    isComplete && "text-green-700",
                    isCurrent && "text-blue-700",
                    isPending && "text-gray-500"
                  )}
                >
                  {stageInfo.label}
                  {/* Show counts for relevant stages */}
                  {stageInfo.id === "analyzing" && details?.tablesFound && (
                    <span className="ml-2 text-xs font-normal">
                      ({details.tablesFound} tables found)
                    </span>
                  )}
                  {stageInfo.id === "relationships" && details?.relationshipsFound && (
                    <span className="ml-2 text-xs font-normal">
                      ({details.relationshipsFound} relationships)
                    </span>
                  )}
                </h4>
                <p
                  className={cn(
                    "text-sm transition-colors",
                    isComplete && "text-green-600",
                    isCurrent && "text-blue-600",
                    isPending && "text-gray-400"
                  )}
                >
                  {/* Dynamic description for generating stage */}
                  {stageInfo.id === "generating" && isCurrent ? (
                    displayElapsed < 5000
                      ? "AI is analyzing your request..."
                      : displayElapsed < 15000
                        ? "Building the optimal SQL query..."
                        : displayElapsed < 30000
                          ? "Processing complex schema context..."
                          : "Almost there, finalizing response..."
                  ) : (
                    stageInfo.description
                  )}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex-shrink-0 text-sm font-medium">
                {isComplete && (
                  <span className="text-green-600">Complete</span>
                )}
                {isCurrent && !showElapsed && (
                  <span className="text-blue-600">In Progress</span>
                )}
                {showElapsed && (
                  <span className="text-blue-600 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {(displayElapsed / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Error State */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-700 mb-1">Error</h4>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Complete State */}
        {stage === "complete" && !error && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-700 mb-1">Query Complete</h4>
            <p className="text-sm text-green-600">
              Results are ready for review
              {totalElapsedMs && ` • Total time: ${(totalElapsedMs / 1000).toFixed(1)}s`}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
