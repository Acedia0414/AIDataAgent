/**
 * SQL Viewer Modal Component
 * 
 * Displays formatted SQL with:
 * - T-SQL syntax highlighting
 * - Copy to clipboard functionality
 * - Layman explanation
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { format } from "sql-formatter";
import { toast } from "sonner";

interface SqlViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sql: string;
  explanation?: {
    technical: string;
    layman: string;
  };
}

export function SqlViewerModal({
  open,
  onOpenChange,
  sql,
  explanation,
}: SqlViewerModalProps) {
  const [copied, setCopied] = useState(false);

  const formatSqlSafely = (sql: string) => {
    try {
      // Basic SQL validation before formatting
      if (!sql || typeof sql !== 'string') {
        console.warn("Invalid SQL input:", sql);
        return sql || '';
      }

      // Check for common syntax issues
      const trimmedSql = sql.trim();
      if (!trimmedSql.toUpperCase().startsWith('SELECT')) {
        console.warn("SQL doesn't start with SELECT:", trimmedSql.substring(0, 50));
      }

      // Check for unmatched quotes
      const singleQuotes = (trimmedSql.match(/'/g) || []).length;
      const doubleQuotes = (trimmedSql.match(/"/g) || []).length;
      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
        console.warn("Unmatched quotes detected in SQL:", trimmedSql);
      }

      return format(sql, {
        language: "tsql", // T-SQL formatting for SQL Server
        tabWidth: 2,
        keywordCase: "upper",
        linesBetweenQueries: 2,
      });
    } catch (error) {
      console.error("SQL formatting error:", error);
      console.error("Original SQL:", sql);
      console.error("Error details:", (error as Error).message);
      
      // Show user-friendly error message
      toast.error("SQL formatting failed. Showing original query.");
      
      // Return original SQL if formatting fails
      return sql;
    }
  };

  const formattedSql = formatSqlSafely(sql);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedSql);
      setCopied(true);
      toast.success("SQL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy SQL");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generated SQL Query</DialogTitle>
          {explanation?.layman && (
            <DialogDescription className="text-base">
              {explanation.layman}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* SQL Code Block */}
          <div className="flex-1 overflow-y-auto bg-slate-900 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-slate-400 font-mono">T-SQL</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="text-sm text-slate-100 font-mono overflow-x-auto">
              <code>{formattedSql}</code>
            </pre>
          </div>

          {/* Technical Explanation */}
          {explanation?.technical && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Technical Details
              </h4>
              <p className="text-sm text-blue-800">{explanation.technical}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
