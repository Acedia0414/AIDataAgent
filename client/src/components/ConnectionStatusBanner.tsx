import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Database, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

/**
 * Connection Status Banner
 * 
 * Displays the active database connection and LLM provider status.
 * Shows warnings if not configured with quick links to Settings pages.
 */
export function ConnectionStatusBanner() {
  const [, navigate] = useLocation();
  
  const { data: activeConnection, isLoading: loadingConnection } = trpc.config.getActiveConnection.useQuery();
  const { data: activeLlm, isLoading: loadingLlm } = trpc.config.getActiveLlmConfig.useQuery();

  const hasConnection = !!activeConnection;
  const hasLlm = !!activeLlm;
  const allConfigured = hasConnection && hasLlm;

  if (loadingConnection || loadingLlm) {
    return null;
  }

  if (allConfigured) {
    return (
      <Alert className="border-green-200 bg-green-50/50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              <strong>{activeConnection.name}</strong>
              <span className="text-muted-foreground">
                ({activeConnection.databaseType})
              </span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <strong>
                {activeLlm.provider === "manus_builtin" ? "Manus Built-in" : 
                 activeLlm.provider === "openai" ? "OpenAI" : 
                 "Azure OpenAI"}
              </strong>
            </span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-200 bg-amber-50/50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-sm">
          {!hasConnection && !hasLlm && (
            <span>
              <strong>Configuration Required:</strong> Please configure a database connection and LLM provider to start querying.
            </span>
          )}
          {!hasConnection && hasLlm && (
            <span>
              <strong>Database Not Configured:</strong> Please configure a database connection to execute queries.
            </span>
          )}
          {hasConnection && !hasLlm && (
            <span>
              <strong>LLM Not Configured:</strong> Please configure an LLM provider to generate SQL queries.
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!hasConnection && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/database-settings")}
            >
              Configure Database
            </Button>
          )}
          {!hasLlm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/llm-settings")}
            >
              Configure LLM
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
