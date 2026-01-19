import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StageStatus = "pending" | "active" | "complete" | "error";

export interface Stage {
  id: string;
  label: string;
  status: StageStatus;
  description?: string;
  error?: string;
  startTime?: number;
  endTime?: number;
}

interface StageTrackerProps {
  stages: Stage[];
  className?: string;
  compact?: boolean;
}

export function StageTracker({ stages, className, compact = false }: StageTrackerProps) {
  if (stages.length === 0) return null;

  const activeStage = stages.find((s) => s.status === "active");
  const completedCount = stages.filter((s) => s.status === "complete").length;
  const hasError = stages.some((s) => s.status === "error");

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {hasError ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : activeStage ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : completedCount === stages.length ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : null}
          <span className="font-medium">
            {hasError
              ? "Error occurred"
              : activeStage
              ? activeStage.label
              : completedCount === stages.length
              ? "Complete"
              : "Ready"}
          </span>
        </div>
        <span className="text-muted-foreground">
          {completedCount}/{stages.length} stages
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-500 rounded-full",
            hasError ? "bg-red-500" : "bg-blue-500"
          )}
          style={{
            width: `${(completedCount / stages.length) * 100}%`,
          }}
        />
      </div>

      {/* Stage List */}
      {!compact && (
        <div className="space-y-2">
          {stages.map((stage, idx) => {
            const Icon =
              stage.status === "complete"
                ? CheckCircle2
                : stage.status === "active"
                ? Loader2
                : stage.status === "error"
                ? AlertCircle
                : Circle;

            const duration =
              stage.startTime && stage.endTime
                ? ((stage.endTime - stage.startTime) / 1000).toFixed(2)
                : null;

            return (
              <div
                key={stage.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-all",
                  stage.status === "active" && "bg-blue-50 border-blue-200",
                  stage.status === "complete" && "bg-green-50 border-green-200",
                  stage.status === "error" && "bg-red-50 border-red-200",
                  stage.status === "pending" && "bg-muted/30 border-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 mt-0.5 flex-shrink-0",
                    stage.status === "active" && "animate-spin text-blue-600",
                    stage.status === "complete" && "text-green-600",
                    stage.status === "error" && "text-red-600",
                    stage.status === "pending" && "text-muted-foreground"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "font-medium text-sm",
                        stage.status === "pending" && "text-muted-foreground"
                      )}
                    >
                      {stage.label}
                    </span>
                    {duration && (
                      <span className="text-xs text-muted-foreground">
                        {duration}s
                      </span>
                    )}
                  </div>
                  {stage.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stage.description}
                    </p>
                  )}
                  {stage.error && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {stage.error}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
