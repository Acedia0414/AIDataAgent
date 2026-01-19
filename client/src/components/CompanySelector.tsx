/**
 * Company Selector Component for D365 F&O
 *
 * Allows users to select which company (DataAreaId) to query against.
 * D365 F&O is multi-company, so queries should be filtered by DataAreaId.
 * Companies are fetched from the D365 DataArea table via the backend.
 */

import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CompanySelectorProps {
  value: string;
  onChange: (company: string) => void;
  className?: string;
}

export function CompanySelector({ value, onChange, className }: CompanySelectorProps) {
  const { data: companiesData, isLoading, error } = trpc.config.getCompanies.useQuery();

  const companies = companiesData?.companies || [];
  const hasError = !companiesData?.success || error;
  const errorMessage = companiesData?.error || error?.message;

  // Show error notification if there's an error
  useEffect(() => {
    if (hasError && errorMessage) {
      toast.error("Company fetch error", {
        description: errorMessage,
        duration: Infinity, // Persistent - user must dismiss
        closeButton: true,
        action: {
          label: "Copy Error",
          onClick: () => {
            navigator.clipboard.writeText(errorMessage);
            toast.success("Error copied to clipboard");
          },
        },
      });
    }
  }, [hasError, errorMessage]);

  // Show warning if using cached/fallback data
  useEffect(() => {
    if (companiesData?.warning) {
      toast.warning("Using cached companies", {
        description: companiesData.warning,
        duration: 10000, // 10 seconds for warnings
        closeButton: true,
      });
    }
  }, [companiesData?.warning]);

  // Set default company if none selected
  useEffect(() => {
    if (!value && companies.length > 0) {
      onChange(companies[0].code);
    }
  }, [value, companies, onChange]);

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger className="h-8 w-[180px] text-sm border-muted-foreground/20">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading...
            </span>
          ) : hasError ? (
            <span className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-3 w-3" />
              <SelectValue placeholder="Error" />
            </span>
          ) : (
            <SelectValue placeholder="Select company..." />
          )}
        </SelectTrigger>
        <SelectContent>
          {companies.length === 0 && !isLoading ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              {hasError ? "Connection error - using fallback" : "No companies available"}
            </div>
          ) : (
            companies.map((company) => (
              <SelectItem key={company.code} value={company.code}>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{company.code}</span>
                  <span className="text-xs text-muted-foreground">{company.name}</span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
