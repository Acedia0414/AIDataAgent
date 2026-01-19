import { useAuth } from "@/_core/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { ConnectionStatusBanner } from "@/components/ConnectionStatusBanner";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExecutionAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  // Fetch analytics data
  const { data: analytics, isLoading } = trpc.multiStep.getAnalytics.useQuery(
    { dateRange },
    { enabled: !!user }
  );

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Navigation />
      <ConnectionStatusBanner />
      
      <div className="flex-1 overflow-auto bg-background p-6">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Execution Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Insights into multi-step query performance and patterns
              </p>
            </div>
            
            {/* Date Range Filter */}
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !analytics ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No analytics data available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Key Metrics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Executions */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Executions</p>
                      <h3 className="text-3xl font-bold mt-2">{analytics.totalExecutions}</h3>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </Card>

                {/* Success Rate */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                      <h3 className="text-3xl font-bold mt-2">{analytics.successRate.toFixed(1)}%</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {analytics.completedCount} completed
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </Card>

                {/* Failure Rate */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Failure Rate</p>
                      <h3 className="text-3xl font-bold mt-2">{analytics.failureRate.toFixed(1)}%</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {analytics.failedCount} failed
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-red-500" />
                    </div>
                  </div>
                </Card>

                {/* Average Duration */}
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                      <h3 className="text-3xl font-bold mt-2">
                        {(analytics.averageDurationMs / 1000).toFixed(1)}s
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        per execution
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Most Common Queries */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Most Common Queries</h2>
                <div className="space-y-3">
                  {analytics.commonQueries.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No queries yet</p>
                  ) : (
                    analytics.commonQueries.map((query: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{query.query}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {query.count} execution{query.count > 1 ? 's' : ''} • 
                            Success rate: {((query.successCount / query.count) * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <span className="text-sm font-semibold text-green-600">
                            {query.successCount}
                          </span>
                          <span className="text-xs text-muted-foreground">/</span>
                          <span className="text-sm font-semibold text-red-600">
                            {query.failureCount}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Failure Patterns */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Failure Patterns
                </h2>
                <div className="space-y-3">
                  {analytics.failurePatterns.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No failures yet</p>
                  ) : (
                    analytics.failurePatterns.map((pattern: any, index: number) => (
                      <div key={index} className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-red-900 dark:text-red-100">
                              {pattern.errorType}
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                              {pattern.errorMessage}
                            </p>
                          </div>
                          <span className="ml-4 text-sm font-semibold text-red-600 dark:text-red-400">
                            {pattern.count} occurrence{pattern.count > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
