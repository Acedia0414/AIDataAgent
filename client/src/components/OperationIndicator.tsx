import { Database, Brain, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type OperationType = "metadata" | "ai" | "database" | "processing";
export type OperationStatus = "idle" | "active" | "complete";

interface OperationIndicatorProps {
  type: OperationType;
  status: OperationStatus;
  label?: string;
  className?: string;
}

const operationConfig = {
  metadata: {
    icon: FileText,
    label: "Metadata",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  ai: {
    icon: Brain,
    label: "AI Processing",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  database: {
    icon: Database,
    label: "Database Query",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  processing: {
    icon: Loader2,
    label: "Processing",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
};

export function OperationIndicator({
  type,
  status,
  label,
  className,
}: OperationIndicatorProps) {
  const config = operationConfig[type];
  const Icon = config.icon;
  const displayLabel = label || config.label;

  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
        config.bgColor,
        config.borderColor,
        config.color,
        status === "active" && "animate-pulse",
        className
      )}
    >
      {status === "active" ? (
        <Icon className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      <span>{displayLabel}</span>
    </div>
  );
}

interface OperationIndicatorsProps {
  operations: {
    type: OperationType;
    status: OperationStatus;
    label?: string;
  }[];
  className?: string;
}

export function OperationIndicators({
  operations,
  className,
}: OperationIndicatorsProps) {
  const activeOperations = operations.filter((op) => op.status !== "idle");

  if (activeOperations.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {activeOperations.map((op, idx) => (
        <OperationIndicator
          key={`${op.type}-${idx}`}
          type={op.type}
          status={op.status}
          label={op.label}
        />
      ))}
    </div>
  );
}
