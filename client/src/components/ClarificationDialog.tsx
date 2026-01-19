import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface ClarificationField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: string[];
  placeholder?: string;
  required: boolean;
  context?: string; // Optional context explaining why this is needed
}

interface ClarificationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (clarifications: Record<string, string>) => void;
  originalQuery: string;
  missingContext: string[];
  preformattedFields?: ClarificationField[]; // LLM-generated fields take precedence
}

export function ClarificationDialog({
  open,
  onClose,
  onSubmit,
  originalQuery,
  missingContext,
  preformattedFields,
}: ClarificationDialogProps) {
  const [clarifications, setClarifications] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get available tables for suggestions
  const { data: tables } = trpc.metadata.listTables.useQuery(undefined, {
    enabled: open,
  });
  // Filter out questions we never want to ask (limit/count handled automatically)
  const filteredContext = missingContext.filter(context => {
    if (context.includes('limit') || context.includes('count') || context.includes('number of records')) {
      return false;
    }
    return true;
  });

  // Use preformatted fields from LLM if available, otherwise generate from context
  const fields: ClarificationField[] = preformattedFields && preformattedFields.length > 0
    ? preformattedFields.map(f => ({
      name: f.name,
      label: f.label,
      type: f.type,
      options: f.options,
      placeholder: f.placeholder || `Enter ${f.name}`,
      required: f.required,
      context: f.context,
    }))
    : filteredContext.map((context) => {
      if (context.includes('table')) {
        return {
          name: 'tableName',
          label: 'Which table do you want to query?',
          type: 'select',
          options: tables?.map((t: any) => t.tableName) || [],
          placeholder: 'Select a table',
          required: true,
        };
      }
      if (context.includes('date range') || context.includes('time period')) {
        return {
          name: 'dateRange',
          label: 'What date range do you need?',
          type: 'text',
          placeholder: 'e.g., last 30 days, 2024-01-01 to 2024-12-31',
          required: true,
        };
      }
      if (context.includes('filter') || context.includes('condition')) {
        return {
          name: 'filterCondition',
          label: 'What filter condition should be applied?',
          type: 'text',
          placeholder: 'e.g., status = active, amount > 1000',
          required: true,
        };
      }
      if (context.includes('company') || context.includes('DataAreaId')) {
        return {
          name: 'company',
          label: 'Which company/legal entity?',
          type: 'text',
          placeholder: 'e.g., USMF, USRT',
          required: true,
        };
      }
      // Generic text field for other missing context
      return {
        name: context.toLowerCase().replace(/\s+/g, '_'),
        label: `Please specify: ${context}`,
        type: 'text',
        placeholder: `Enter ${context}`,
        required: true,
      };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const missingRequired = fields.filter(f => f.required && !clarifications[f.name]);
    if (missingRequired.length > 0) {
      return;
    }

    setIsSubmitting(true);
    onSubmit(clarifications);
  };

  const handleChange = (name: string, value: string) => {
    setClarifications(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (!open) {
      setClarifications({});
      setIsSubmitting(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <DialogTitle>Need More Information</DialogTitle>
              <DialogDescription className="mt-2">
                Your query needs some clarification to generate accurate results. Please provide the missing information below.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Original Query Display */}
          <div className="bg-gray-50 p-3 rounded-md border">
            <p className="text-sm font-medium text-gray-700 mb-1">Your Original Query:</p>
            <p className="text-sm text-gray-900">{originalQuery}</p>
          </div>

          {/* Clarification Fields */}
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>

                {field.type === 'select' ? (
                  <Select
                    value={clarifications[field.name] || ""}
                    onValueChange={(value) => handleChange(field.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    value={clarifications[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Continue with Query'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
