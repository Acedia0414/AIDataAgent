import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ExecutionHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'running'>('all');
  const [expandedExecutionId, setExpandedExecutionId] = useState<number | null>(null);

  // Fetch execution history
  const { data: executions, isLoading, refetch } = trpc.multiStep.getExecutionHistory.useQuery({
    limit: 50,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  // Fetch execution details when expanded
  const { data: executionDetails } = trpc.multiStep.getExecutionDetails.useQuery(
    { executionId: expandedExecutionId! },
    { enabled: expandedExecutionId !== null }
  );

  // Replay execution mutation
  const replayExecution = trpc.multiStep.replayExecution.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Filter executions by search query
  const filteredExecutions = executions?.filter(execution =>
    execution.naturalLanguageQuery.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const handleReplay = (executionId: number) => {
    if (confirm('Replay this execution with the same plan?')) {
      replayExecution.mutate({ executionId });
    }
  };

  const toggleExpand = (executionId: number) => {
    setExpandedExecutionId(expandedExecutionId === executionId ? null : executionId);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Execution History</h1>
          <p className="text-muted-foreground mt-1">
            View and replay past multi-step query executions
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by query text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Execution List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredExecutions.length === 0 ? (
        <Card className="p-12 text-center">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Executions Found</h3>
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Multi-step query executions will appear here'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredExecutions.map((execution) => (
            <Card key={execution.id} className="overflow-hidden">
              {/* Execution Header */}
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(execution.status)}
                    {getStatusBadge(execution.status)}
                    {execution.outputFormat && (
                      <Badge variant="outline" className="uppercase">
                        {execution.outputFormat}
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {execution.totalSteps} steps
                    </span>
                  </div>
                  
                  <p className="font-medium text-sm mb-1 truncate">
                    {execution.naturalLanguageQuery}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(execution.createdAt), { addSuffix: true })}
                    </span>
                    {execution.durationMs && (
                      <span>{(execution.durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {execution.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReplay(execution.id)}
                      disabled={replayExecution.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Replay
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleExpand(execution.id)}
                  >
                    {expandedExecutionId === execution.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Execution Details (Expanded) */}
              {expandedExecutionId === execution.id && executionDetails && (
                <div className="border-t bg-muted/30 p-4 space-y-4">
                  {/* Plan Explanation */}
                  {executionDetails.execution.planExplanation && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Plan Overview</h4>
                      <p className="text-sm text-muted-foreground">
                        {executionDetails.execution.planExplanation}
                      </p>
                    </div>
                  )}

                  {/* Steps */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Execution Steps</h4>
                    <div className="space-y-3">
                      {executionDetails.steps.map((step) => (
                        <div
                          key={step.id}
                          className="bg-background rounded-lg border p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Step {step.stepNumber}
                              </span>
                              {getStatusBadge(step.status)}
                              {step.sheetName && (
                                <Badge variant="outline" className="text-xs">
                                  {step.sheetName}
                                </Badge>
                              )}
                            </div>
                            {step.rowCount !== null && (
                              <span className="text-xs text-muted-foreground">
                                {step.rowCount} rows
                              </span>
                            )}
                          </div>

                          {step.description && (
                            <p className="text-sm text-muted-foreground">
                              {step.description}
                            </p>
                          )}

                          {step.sql && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                View SQL Query
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                                {step.sql}
                              </pre>
                            </details>
                          )}

                          {step.error && (
                            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                              <strong>Error:</strong> {step.error}
                            </div>
                          )}

                          {step.columns && (
                            <div className="text-xs text-muted-foreground">
                              <strong>Columns:</strong> {step.columns.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error Message (if execution failed) */}
                  {executionDetails.execution.error && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                        Execution Error
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {executionDetails.execution.error}
                      </p>
                    </div>
                  )}

                  {/* File URL (if available) */}
                  {executionDetails.execution.fileUrl && (
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(executionDetails.execution.fileUrl!, '_blank')}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Download Result File
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
