import { useAuth } from "@/_core/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { ConnectionStatusBanner } from "@/components/ConnectionStatusBanner";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function RetryLimitSettings() {
  const { user, loading: authLoading } = useAuth();
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newRetryLimit, setNewRetryLimit] = useState<number>(3);

  // Fetch all users (admin only)
  const { data: users, isLoading, refetch } = trpc.admin.getAllUsers.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  // Update retry limit mutation
  const updateRetryLimit = trpc.admin.updateUserRetryLimit.useMutation({
    onSuccess: () => {
      toast.success("Retry limit updated successfully");
      setEditingUserId(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to update retry limit: ${error.message}`);
    },
  });

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex h-screen flex-col">
        <Navigation />
        <ConnectionStatusBanner />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">
              You need administrator privileges to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = (userId: number) => {
    if (newRetryLimit < 1 || newRetryLimit > 10) {
      toast.error("Retry limit must be between 1 and 10");
      return;
    }
    updateRetryLimit.mutate({ userId, retryLimit: newRetryLimit });
  };

  return (
    <div className="flex h-screen flex-col">
      <Navigation />
      <ConnectionStatusBanner />

      <div className="flex-1 overflow-auto bg-background p-6">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Retry Limit Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure maximum retry attempts for query execution per user
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Card className="p-6">
              <div className="space-y-4">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 pb-3 border-b font-semibold text-sm">
                  <div className="col-span-4">User</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-3">Retry Limit</div>
                  <div className="col-span-3">Actions</div>
                </div>

                {/* User Rows */}
                {users.map((u: any) => (
                  <div key={u.id} className="grid grid-cols-12 gap-4 items-center py-2 border-b last:border-0">
                    <div className="col-span-4">
                      <p className="font-medium">{u.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${u.role === "admin"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        }`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="col-span-3">
                      {editingUserId === u.id ? (
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={newRetryLimit}
                          onChange={(e) => setNewRetryLimit(parseInt(e.target.value) || 3)}
                          className="w-20"
                        />
                      ) : (
                        <span className="text-sm font-semibold">{u.retryLimit || 3} attempts</span>
                      )}
                    </div>
                    <div className="col-span-3">
                      {editingUserId === u.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(u.id)}
                            disabled={updateRetryLimit.isPending}
                          >
                            {updateRetryLimit.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingUserId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUserId(u.id);
                            setNewRetryLimit(u.retryLimit || 3);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Info Card */}
          <Card className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <h3 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
              About Retry Limits
            </h3>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Retry limits control how many times a failed step can be retried</li>
              <li>• Default limit is 3 attempts per step</li>
              <li>• Admins can set limits between 1 and 10 attempts</li>
              <li>• Higher limits allow more flexibility but may increase execution time</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
