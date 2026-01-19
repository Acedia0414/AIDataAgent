import { useEffect, useRef } from "react";
import { trpc } from "../lib/trpc";

/**
 * Simple polling hook for execution progress
 * Much easier to understand and maintain than SSE
 * 
 * @param executionId - The execution ID to poll for
 * @param onProgress - Callback when progress updates are received
 * @param enabled - Whether polling is enabled
 * @param intervalMs - Polling interval in milliseconds (default: 1500ms)
 */
export function useExecutionPolling(
  executionId: number | null,
  onProgress: (data: {
    execution: {
      id: number;
      status: string;
      completedAt: Date | null;
      durationMs: number | null;
    };
    steps: Array<{
      stepNumber: number;
      description: string | null;
      sheetName: string | null;
      status: string;
      rowCount: number | null;
      columns: string[] | null;
      error: string | null;
      sql: string | null;
      durationMs: number | null;
      retryCount?: number;
    }>;
  }) => void,
  enabled: boolean = true,
  intervalMs: number = 1500
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    // Don't poll if disabled or no executionId
    if (!enabled || !executionId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    console.log(`[useExecutionPolling] Starting polling for execution ${executionId}`);

    // Poll immediately
    pollOnce();

    // Then poll at interval
    intervalRef.current = setInterval(() => {
      pollOnce();
    }, intervalMs);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        console.log(`[useExecutionPolling] Stopping polling for execution ${executionId}`);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [executionId, enabled, intervalMs]);

  async function pollOnce() {
    if (!executionId) return;

    try {
      const data = await utils.multiStep.pollExecutionProgress.fetch({ executionId });
      
      console.log(`[useExecutionPolling] Poll result:`, {
        executionId,
        status: data.execution.status,
        steps: data.steps.map(s => ({ step: s.stepNumber, status: s.status })),
      });

      // Call the progress callback
      onProgress(data);

      // Stop polling if execution is complete or failed
      if (data.execution.status === "completed" || data.execution.status === "failed") {
        console.log(`[useExecutionPolling] Execution ${executionId} finished with status: ${data.execution.status}`);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (error) {
      console.error(`[useExecutionPolling] Poll error for execution ${executionId}:`, error);
      // Continue polling even on error (might be temporary network issue)
    }
  }
}
