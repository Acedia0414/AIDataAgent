import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TableRule {
  id: number;
  tableName: string;
  tableRule: string;
  isActive: boolean;
  priority: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

const COMMON_TABLES = [
  'PurchTable', 'PurchLine', 'VendTable', 'SalesTable', 'SalesLine', 
  'CustTable', 'InventTable', 'LedgerTable', 'HcmWorker', 'ProjTable',
  'ProdTable', 'BOMTable', 'BankGroup', 'BankAccountTable', 'Currency'
];

export default function TableRules() {
  const { user, loading: authLoading } = useAuth();
  const [rules, setRules] = useState<TableRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TableRule | null>(null);
  const [formData, setFormData] = useState({
    tableName: '',
    tableRule: '',
    description: '',
    priority: 0
  });

  const { data: rulesData, refetch } = trpc.admin.tableRules.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createRule = trpc.admin.tableRules.create.useMutation({
    onSuccess: () => {
      toast.success("Table rule created successfully");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Failed to create rule: ${error.message}`);
    }
  });

  const updateStatus = trpc.admin.tableRules.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Rule status updated successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to update status: ${error.message}`);
    }
  });

  const deleteRule = trpc.admin.tableRules.delete.useMutation({
    onSuccess: () => {
      toast.success("Rule deleted successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    }
  });

  // Update rules when data changes
  useEffect(() => {
    if (rulesData) {
      setRules(rulesData);
      setLoading(false);
    }
  }, [rulesData]);

  const resetForm = () => {
    setFormData({
      tableName: '',
      tableRule: '',
      description: '',
      priority: 0
    });
  };

  const handleCreateRule = () => {
    if (!formData.tableName || !formData.tableRule) {
      toast.error("Table name and rule are required");
      return;
    }

    createRule.mutate(formData);
  };

  const handleUpdateStatus = (id: number, isActive: boolean) => {
    updateStatus.mutate({ id, isActive });
  };

  const handleDeleteRule = (id: number) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      deleteRule.mutate({ id });
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 10) return "bg-red-100 text-red-800";
    if (priority >= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Authentication Required
              </CardTitle>
              <CardDescription>
                You need to be logged in as an administrator to access table rules management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href={getLoginUrl()}>Login to Continue</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Table Rules Management</h1>
            <p className="text-gray-600 mt-2">
              Manage rules that guide AI query generation for specific tables
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Create New Table Rule</DialogTitle>
                <DialogDescription>
                  Add a new rule to guide AI query generation for a specific table.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
                <div className="grid gap-2">
                  <Label htmlFor="tableName">Table Name</Label>
                  <Select
                    value={formData.tableName}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tableName: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select or type table name" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TABLES.map(table => (
                        <SelectItem key={table} value={table}>{table}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="tableRule">Rule</Label>
                  <Textarea
                    id="tableRule"
                    placeholder="e.g., Always join with VendTable on OrderAccount = AccountNum when vendor information is requested"
                    value={formData.tableRule}
                    onChange={(e) => setFormData(prev => ({ ...prev, tableRule: e.target.value }))}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of what this rule does"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  />
                  <p className="text-sm text-gray-500">
                    Higher priority rules take precedence (0-100)
                  </p>
                </div>
              </div>
              <DialogFooter className="flex-shrink-0 border-t pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRule} disabled={createRule.isPending}>
                  {createRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Rule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Table Rules Found</h3>
                <p className="text-gray-600 text-center mb-4">
                  Get started by creating your first table rule to guide AI query generation.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id} className={`${!rule.isActive ? 'opacity-75' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{rule.tableName}</CardTitle>
                        <Badge className={getPriorityColor(rule.priority)}>
                          Priority: {rule.priority}
                        </Badge>
                        <Badge variant={rule.isActive ? "default" : "secondary"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {rule.description && (
                        <CardDescription>{rule.description}</CardDescription>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) => handleUpdateStatus(rule.id, checked)}
                        disabled={updateStatus.isPending}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={deleteRule.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Rule</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md break-words">
                        {rule.tableRule}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Created: {new Date(rule.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(rule.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
