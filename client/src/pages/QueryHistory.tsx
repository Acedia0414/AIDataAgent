import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle, Clock, Search, Filter, X } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo } from "react";

export default function QueryHistory() {
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { data: history, isLoading } = trpc.query.history.useQuery(undefined, {
    enabled: !!user,
  });

  // Filter and search logic
  const filteredHistory = useMemo(() => {
    if (!history) return [];

    let filtered = [...history];

    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (query) =>
          query.naturalLanguageQuery?.toLowerCase().includes(lowerSearch) ||
          query.generatedSql?.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((query) => query.executionStatus === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter((query) => new Date(query.createdAt) >= filterDate);
    }

    return filtered;
  }, [history, searchTerm, statusFilter, dateFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || dateFilter !== "all";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Query History</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search queries or SQL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            {history && history.length > 0 && (
              <div className="text-sm text-muted-foreground mt-3">
                Showing {filteredHistory.length} of {history.length} queries
              </div>
            )}
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No query history yet. Start asking questions in the chat!
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No queries match your filters. Try adjusting your search criteria.
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Natural Language Query</TableHead>
                      <TableHead>Generated SQL</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Time (ms)</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((query) => (
                      <TableRow key={query.id}>
                        <TableCell>
                          {query.executionStatus === "success" ? (
                            <Badge variant="default" className="flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3" />
                              Success
                            </Badge>
                          ) : query.executionStatus === "error" ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <XCircle className="h-3 w-3" />
                              Error
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={query.naturalLanguageQuery}>
                            {query.naturalLanguageQuery || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <code className="text-xs bg-muted px-2 py-1 rounded block truncate" title={query.generatedSql}>
                            {query.generatedSql}
                          </code>
                        </TableCell>
                        <TableCell>{query.rowCount || 0}</TableCell>
                        <TableCell>{query.executionTime || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(query.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
