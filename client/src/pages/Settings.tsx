import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, Settings2 } from "lucide-react";
import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { LLMSettingsSection } from "@/components/LLMSettingsSection";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [connectionForm, setConnectionForm] = useState({
    name: "",
    server: "",
    database: "",
    username: "",
    password: "",
    port: 1433,
  });

  const [roleForm, setRoleForm] = useState({
    roleName: "",
    roleId: "",
    description: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: string } | null>(null);

  const { data: connections, refetch: refetchConnections } = trpc.azureSql.getConnections.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" }
  );

  const { data: userRoles, refetch: refetchRoles } = trpc.securityRoles.getUserRoles.useQuery(
    {},
    { enabled: !!user }
  );

  const createConnection = trpc.azureSql.createConnection.useMutation({
    onSuccess: () => {
      toast.success("Connection created successfully");
      setConnectionForm({
        name: "",
        server: "",
        database: "",
        username: "",
        password: "",
        port: 1433,
      });
      refetchConnections();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const testConnection = trpc.azureSql.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error(`Connection test failed: ${data.error}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addRole = trpc.securityRoles.addRole.useMutation({
    onSuccess: () => {
      toast.success("Security role added successfully");
      setRoleForm({
        roleName: "",
        roleId: "",
        description: "",
      });
      refetchRoles();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Early returns must come after all hooks to avoid "rendered more hooks" error
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Use navigate instead of window.location to avoid issues
    setTimeout(() => {
      window.location.href = getLoginUrl();
    }, 0);
    return null;
  }

  const handleCreateConnection = (e: React.FormEvent) => {
    e.preventDefault();
    createConnection.mutate(connectionForm);
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    addRole.mutate({
      userId: user.id,
      roleName: roleForm.roleName,
      roleId: roleForm.roleId || undefined,
      description: roleForm.description || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs defaultValue="connection" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection">Azure SQL Connection</TabsTrigger>
            <TabsTrigger value="roles">Security Roles</TabsTrigger>
            <TabsTrigger value="azure-ad">Azure AD Mappings</TabsTrigger>
            <TabsTrigger value="llm-config">LLM Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-6">
            {user.role === "admin" ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Azure SQL Database Connection</CardTitle>
                    <CardDescription>
                      Configure connection to your D365 F&O Azure SQL Database
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateConnection} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Connection Name</Label>
                        <Input
                          id="name"
                          value={connectionForm.name}
                          onChange={(e) =>
                            setConnectionForm({ ...connectionForm, name: e.target.value })
                          }
                          placeholder="Production Database"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="server">Server</Label>
                        <Input
                          id="server"
                          value={connectionForm.server}
                          onChange={(e) =>
                            setConnectionForm({ ...connectionForm, server: e.target.value })
                          }
                          placeholder="myserver.database.windows.net"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="database">Database</Label>
                        <Input
                          id="database"
                          value={connectionForm.database}
                          onChange={(e) =>
                            setConnectionForm({ ...connectionForm, database: e.target.value })
                          }
                          placeholder="AXDB"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={connectionForm.username}
                            onChange={(e) =>
                              setConnectionForm({ ...connectionForm, username: e.target.value })
                            }
                            placeholder="sqladmin"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={connectionForm.password}
                            onChange={(e) =>
                              setConnectionForm({ ...connectionForm, password: e.target.value })
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          type="number"
                          value={connectionForm.port}
                          onChange={(e) =>
                            setConnectionForm({ ...connectionForm, port: parseInt(e.target.value) })
                          }
                          placeholder="1433"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={createConnection.isPending}
                          className="flex-1"
                        >
                          {createConnection.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Create Connection
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => testConnection.mutate()}
                          disabled={testConnection.isPending}
                        >
                          {testConnection.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Test Connection
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Existing Connections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {connections && connections.length > 0 ? (
                      <div className="space-y-2">
                        {connections.map((conn) => (
                          <div
                            key={conn.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <div className="font-semibold">{conn.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {conn.server} / {conn.database}
                              </div>
                            </div>
                            {conn.isActive ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No connections configured yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    Only administrators can manage database connections
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your D365 Security Roles</CardTitle>
                <CardDescription>
                  These roles determine what data you can access through queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userRoles && userRoles.length > 0 ? (
                  <div className="space-y-2">
                    {userRoles.map((role) => (
                      <div key={role.id} className="p-3 border rounded-lg">
                        <div className="font-semibold">{role.roleName}</div>
                        {role.description && (
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No security roles assigned yet
                  </div>
                )}
              </CardContent>
            </Card>

            {user.role === "admin" && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Security Role</CardTitle>
                  <CardDescription>
                    Add D365 security roles to your profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddRole} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="roleName">Role Name</Label>
                      <Input
                        id="roleName"
                        value={roleForm.roleName}
                        onChange={(e) =>
                          setRoleForm({ ...roleForm, roleName: e.target.value })
                        }
                        placeholder="Sales Manager"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roleId">Role ID (Optional)</Label>
                      <Input
                        id="roleId"
                        value={roleForm.roleId}
                        onChange={(e) =>
                          setRoleForm({ ...roleForm, roleId: e.target.value })
                        }
                        placeholder="SALESMGR"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        value={roleForm.description}
                        onChange={(e) =>
                          setRoleForm({ ...roleForm, description: e.target.value })
                        }
                        placeholder="Sales management role"
                      />
                    </div>
                    <Button type="submit" disabled={addRole.isPending} className="w-full">
                      {addRole.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Add Role
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="azure-ad" className="space-y-6">
            {user.role === "admin" ? (
              <AzureAdMappingsTab />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Access Denied</CardTitle>
                  <CardDescription>
                    Only administrators can manage Azure AD group mappings.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="llm-config" className="space-y-6">
            {user.role === "admin" ? (
              <LLMSettingsSection isEmbedded={true} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Access Denied</CardTitle>
                  <CardDescription>
                    Only administrators can manage LLM configuration.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Azure AD Group Mappings Component
function AzureAdMappingsTab() {
  const [mappingForm, setMappingForm] = useState({
    azureGroupId: "",
    azureGroupName: "",
    d365RoleName: "",
    description: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: mappings, refetch } = trpc.azureAdGroupMappings.list.useQuery();

  const createMapping = trpc.azureAdGroupMappings.create.useMutation({
    onSuccess: () => {
      toast.success("Azure AD group mapping created successfully");
      setMappingForm({
        azureGroupId: "",
        azureGroupName: "",
        d365RoleName: "",
        description: "",
      });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create mapping: ${error.message}`);
    },
  });

  const deleteMapping = trpc.azureAdGroupMappings.delete.useMutation({
    onSuccess: () => {
      toast.success("Mapping deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete mapping: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMapping.mutate(mappingForm);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Azure AD Group to D365 Role Mappings</CardTitle>
          <CardDescription>
            Map Azure AD security groups to D365 security roles. When users log in via Azure AD,
            their group memberships will be automatically mapped to D365 roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="azureGroupId">Azure AD Group ID *</Label>
              <Input
                id="azureGroupId"
                value={mappingForm.azureGroupId}
                onChange={(e) =>
                  setMappingForm({ ...mappingForm, azureGroupId: e.target.value })
                }
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
              />
              <p className="text-sm text-muted-foreground">
                The Object ID of the Azure AD group (found in Azure Portal)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="azureGroupName">Azure AD Group Name</Label>
              <Input
                id="azureGroupName"
                value={mappingForm.azureGroupName}
                onChange={(e) =>
                  setMappingForm({ ...mappingForm, azureGroupName: e.target.value })
                }
                placeholder="Finance-Team"
              />
              <p className="text-sm text-muted-foreground">
                Optional: Display name for easier identification
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="d365RoleName">D365 Security Role *</Label>
              <Input
                id="d365RoleName"
                value={mappingForm.d365RoleName}
                onChange={(e) =>
                  setMappingForm({ ...mappingForm, d365RoleName: e.target.value })
                }
                placeholder="Finance Manager"
                required
              />
              <p className="text-sm text-muted-foreground">
                The D365 security role name to assign to members of this group
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mappingDescription">Description</Label>
              <Input
                id="mappingDescription"
                value={mappingForm.description}
                onChange={(e) =>
                  setMappingForm({ ...mappingForm, description: e.target.value })
                }
                placeholder="Maps finance team to Finance Manager role"
              />
            </div>
            <Button type="submit" disabled={createMapping.isPending} className="w-full">
              {createMapping.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Mapping
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Mappings</CardTitle>
          <CardDescription>
            {mappings?.length || 0} Azure AD group mapping(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mappings && mappings.length > 0 ? (
            <div className="space-y-3">
              {mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{mapping.azureGroupName || mapping.azureGroupId}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Group ID: {mapping.azureGroupId}
                    </div>
                    <div className="text-sm mt-1">
                      <span className="font-medium">D365 Role:</span> {mapping.d365RoleName}
                    </div>
                    {mapping.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {mapping.description}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirm(mapping.id)}
                    disabled={deleteMapping.isPending}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No Azure AD group mappings configured yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteMapping.mutate({ id: deleteConfirm });
            setDeleteConfirm(null);
          }
        }}
        title="Delete Mapping"
        description="Are you sure you want to delete this Azure AD group mapping? This will affect user access permissions. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
