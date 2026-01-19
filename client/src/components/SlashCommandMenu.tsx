import { useEffect, useState, useRef } from "react";
import { Command } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  template: string;
}

interface SlashCommandMenuProps {
  show: boolean;
  commands: SlashCommand[];
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export function SlashCommandMenu({
  show,
  commands,
  onSelect,
  onClose,
  position,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      setSelectedIndex(0);
    }
  }, [show]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!show) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % commands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + commands.length) % commands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (commands[selectedIndex]) {
          onSelect(commands[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, selectedIndex, commands, onSelect, onClose]);

  if (!show || commands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-96 bg-white border rounded-lg shadow-lg overflow-hidden"
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <div className="p-2 bg-slate-50 border-b flex items-center gap-2 text-sm text-slate-600">
        <Command className="h-4 w-4" />
        <span className="font-medium">Quick Templates</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {commands.map((command, index) => (
          <button
            key={command.id}
            onClick={() => onSelect(command)}
            className={cn(
              "w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors",
              selectedIndex === index && "bg-blue-50"
            )}
          >
            <div className="font-medium text-sm text-slate-900">
              /{command.name}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {command.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Generate template commands based on available metadata
export function generateTemplateCommands(tables: string[]): SlashCommand[] {
  const commands: SlashCommand[] = [];

  // Generic templates
  commands.push({
    id: "all-records",
    name: "all-records",
    description: "Show all records from a table",
    template: "Show me all records from [TABLE_NAME]",
  });

  commands.push({
    id: "count-records",
    name: "count-records",
    description: "Count records in a table",
    template: "How many records are in [TABLE_NAME]?",
  });

  commands.push({
    id: "recent-records",
    name: "recent-records",
    description: "Show recent records from a table",
    template: "Show me the most recent 10 records from [TABLE_NAME]",
  });

  // Table-specific templates
  if (tables.includes("CustTable") || tables.includes("custtable")) {
    commands.push({
      id: "customers-by-group",
      name: "customers-by-group",
      description: "List customers grouped by customer group",
      template: "Show me all customers grouped by customer group",
    });

    commands.push({
      id: "customer-count",
      name: "customer-count",
      description: "Count customers by company",
      template: "How many customers are there in each company?",
    });
  }

  if (tables.includes("SalesTable") || tables.includes("salestable")) {
    commands.push({
      id: "sales-by-status",
      name: "sales-by-status",
      description: "Show sales orders by status",
      template: "Show me all sales orders grouped by status",
    });

    commands.push({
      id: "sales-revenue",
      name: "sales-revenue",
      description: "Calculate total sales revenue",
      template: "What is the total revenue from all sales orders?",
    });

    commands.push({
      id: "top-customers",
      name: "top-customers",
      description: "Find top customers by sales",
      template: "Who are the top 10 customers by total sales amount?",
    });
  }

  if (tables.includes("PurchTable") || tables.includes("purchtable")) {
    commands.push({
      id: "purchase-by-vendor",
      name: "purchase-by-vendor",
      description: "Show purchase orders by vendor",
      template: "Show me all purchase orders grouped by vendor",
    });

    commands.push({
      id: "pending-purchases",
      name: "pending-purchases",
      description: "Find pending purchase orders",
      template: "Show me all pending purchase orders",
    });
  }

  // Multi-step templates
  commands.push({
    id: "excel-by-company",
    name: "excel-by-company",
    description: "Create Excel with sheets per company",
    template: "Create an Excel file with separate sheets for each company from [TABLE_NAME]",
  });

  commands.push({
    id: "excel-alphabetical",
    name: "excel-alphabetical",
    description: "Create Excel with alphabetical sheets",
    template: "Create an Excel file with 3 sheets: records A-G, H-N, and O-Z from [TABLE_NAME]",
  });

  return commands;
}
