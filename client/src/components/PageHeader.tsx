import { Button } from "@/components/ui/button";
import { Database, Home, Cpu } from "lucide-react";
import { useLocation } from "wouter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

interface PageHeaderProps {
  title?: string;
  showNavigation?: boolean;
}

/**
 * Shared page header component with consistent navigation
 * Provides back-to-home button and main navigation links
 */
export function PageHeader({ title = "D365 F&O Data Agent", showNavigation = true }: PageHeaderProps) {
  const [, navigate] = useLocation();
  const { data: activeConfig } = trpc.config.getActiveLlmConfig.useQuery();
  const { data: availableModels } = trpc.config.getAvailableModels.useQuery();

  const modelInfo = availableModels?.find((m: any) => m.id === activeConfig?.model);

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/chat")}
                aria-label="Go to home"
              >
                <Home className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Back to Chat</p>
            </TooltipContent>
          </Tooltip>
          <Database className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold">{title}</h1>

          {/* LLM Model Badge - Always Visible */}
          {activeConfig && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="ml-auto md:ml-4">
                  <Badge variant="secondary" className="flex items-center gap-1 cursor-help">
                    <Cpu className="h-3 w-3" />
                    <span className="text-xs">{activeConfig.model}</span>
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <p><strong>Model:</strong> {activeConfig.model}</p>
                  {modelInfo?.pricing && (
                    <div className="mt-1 pt-1 border-t border-slate-200">
                      <p className="font-semibold">Pricing (per 1M tokens):</p>
                      <p>Input: ${modelInfo.pricing.input}</p>
                      <p>Output: ${modelInfo.pricing.output}</p>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {showNavigation && (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={() => navigate("/metadata")}>
                  Metadata
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage D365 table and field metadata</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={() => navigate("/metadata-viewer")}>
                  Architecture
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View D365 table architecture with fields, relationships, and business logic</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={() => navigate("/knowledge-base")}>
                  Knowledge Base
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload documents for AI context</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={() => navigate("/rag-progress")}>
                  RAG Status
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Monitor RAG system and document processing</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={() => navigate("/connection-test")}>
                  Connection Test
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Test database connectivity (SQL Server, MySQL, PostgreSQL, SQLite, Oracle)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={() => navigate("/history")}>
                  History
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View query execution history</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={() => navigate("/settings")}>
                  Settings
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Configure database and security settings</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={() => navigate("/llm-settings")}>
                  LLM Config
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Configure language model providers (Manus, OpenAI, Azure)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={() => navigate("/database-settings")}>
                  DB Config
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Configure and manage database connections</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </header>
  );
}
