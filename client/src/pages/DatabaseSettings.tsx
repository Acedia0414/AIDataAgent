/**
 * Database Connection Management Settings Page
 * Allows users to configure and persist database connections
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Check, Plus, Trash2, Database, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

type DatabaseType = "sqlserver" | "mysql" | "postgresql" | "sqlite" | "oracle";
type AuthMode = "sql" | "windows";

interface DatabaseConnection {
  id: number;
  name: string;
  databaseType: DatabaseType;
  host: string;
  port: number | null;
  database: string;
  username: string | null;
  authMode: AuthMode | null;
  domain: string | null;
  isActive: boolean | null;
  createdAt: Date | string;
}

export default function DatabaseSettings() {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testingForm, setTestingForm] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; serverVersion?: string } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<DatabaseType>("sqlserver");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(1433);
  const [database, setDatabase] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("sql");
  const [domain, setDomain] = useState("");

  // Queries
  const { data: connections, refetch } = trpc.config.getAllConnections.useQuery();
  const { data: activeConnection } = trpc.config.getActiveConnection.useQuery();

  // Mutations
  const createMutation = trpc.config.createConnection.useMutation({
    onSuccess: () => {
      toast.success("Database connection created successfully");
      refetch();
      resetForm();
      setIsAdding(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to create connection: ${error.message}`);
    },
  });

  const updateMutation = trpc.config.updateConnection.useMutation({
    onSuccess: () => {
      toast.success("Connection updated successfully");
      refetch();
      resetForm();
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteMutation = trpc.config.deleteConnection.useMutation({
    onSuccess: () => {
      toast.success("Connection deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const setActiveMutation = trpc.config.setActiveConnection.useMutation({
    onSuccess: () => {
      toast.success("Active connection updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to set active: ${error.message}`);
    },
  });

  const testMutation = trpc.config.testConnection.useMutation({
    onSuccess: (data: { success: boolean; message: string; serverVersion?: string }) => {
      setTestingForm(false);
      setTestResult(data);

      if (data.success) {
        setTestingId(null);
        const versionInfo = data.serverVersion ? ` (${data.serverVersion})` : "";
        toast.success(`✓ Connection successful${versionInfo}`);
      } else {
        setTestingId(null);
        toast.error(`✗ Connection failed: ${data.message}`);
      }
    },
    onError: (error: any) => {
      setTestingForm(false);
      setTestingId(null);
      setTestResult({
        success: false,
        message: error.message || "Unknown error"
      });
      toast.error(`✗ Connection test failed: ${error.message || "Unknown error"}`);
    },
  });

  const resetForm = () => {
    setName("");
    setType("sqlserver");
    setHost("");
    setPort(1433);
    setDatabase("");
    setUsername("");
    setPassword("");
    setAuthMode("sql");
    setDomain("");
    setTestResult(null);
  };

  const handleSave = () => {
    if (!name || !host || !database) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name,
        databaseType: type,
        host,
        port: port || undefined,
        database,
        username: username || undefined,
        password: password || undefined,
        authMode: type === "sqlserver" ? authMode : undefined,
        domain: domain || undefined,
      });
    } else {
      createMutation.mutate({
        name,
        databaseType: type,
        host,
        port: port || undefined,
        database,
        username: username || undefined,
        password: password || undefined,
        authMode: type === "sqlserver" ? authMode : undefined,
        domain: domain || undefined,
      });
    }
  };

  const handleEdit = (conn: DatabaseConnection) => {
    setEditingId(conn.id);
    setIsAdding(true);
    setName(conn.name);
    setType(conn.databaseType);
    setHost(conn.host);
    setPort(conn.port || getDefaultPort(conn.databaseType));
    setDatabase(conn.database);
    setUsername(conn.username || "");
    setPassword(""); // Don't populate password for security
    setAuthMode(conn.authMode || "sql");
    setDomain(conn.domain || "");
  };

  const handleTestForm = () => {
    if (!host || !database) {
      toast.error("Please fill in host and database fields");
      return;
    }

    setTestingForm(true);
    testMutation.mutate({
      databaseType: type,
      host,
      port: port || undefined,
      database,
      username: username || undefined,
      password: password || undefined,
      authMode: type === "sqlserver" ? authMode : undefined,
      domain: domain || undefined,
    });
  };

  const handleTestSaved = (conn: DatabaseConnection) => {
    setTestingId(conn.id);
    testMutation.mutate({
      databaseType: conn.databaseType,
      host: conn.host,
      port: conn.port || undefined,
      database: conn.database,
      username: conn.username || undefined,
      password: undefined, // Use stored encrypted password
      authMode: conn.authMode || undefined,
      domain: conn.domain || undefined,
    });
  };

  const getDefaultPort = (dbType: DatabaseType): number => {
    switch (dbType) {
      case "sqlserver":
        return 1433;
      case "mysql":
        return 3306;
      case "postgresql":
        return 5432;
      case "oracle":
        return 1521;
      case "sqlite":
        return 0;
    }
  };

  const handleTypeChange = (newType: DatabaseType) => {
    setType(newType);
    setPort(getDefaultPort(newType));
  };

  const getDatabaseTypeLabel = (type: DatabaseType) => {
    switch (type) {
      case "sqlserver":
        return "SQL Server";
      case "mysql":
        return "MySQL";
      case "postgresql":
        return "PostgreSQL";
      case "sqlite":
        return "SQLite";
      case "oracle":
        return "Oracle";
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Database Connections</h1>
        <p className="text-muted-foreground mt-2">
          Configure and manage database connections for query execution
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Credentials are encrypted and stored securely. Set one connection as active to use it for all queries.
        </AlertDescription>
      </Alert>

      {/* Active Connection */}
      {activeConnection && (
        <Card className="mb-6 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Active Connection
            </CardTitle>
            <CardDescription>Currently used for all database queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Name:</span> {activeConnection.name}
              </div>
              <div>
                <span className="font-medium">Type:</span> {getDatabaseTypeLabel(activeConnection.databaseType)}
              </div>
              <div>
                <span className="font-medium">Host:</span> {activeConnection.host}
              </div>
              <div>
                <span className="font-medium">Database:</span> {activeConnection.database}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Connections */}
      <div className="space-y-4 mb-6">
        <h2 className="text-xl font-semibold">Saved Connections</h2>
        {connections && connections.length > 0 ? (
          connections.map((conn) => (
            <Card key={conn.id} className={conn.isActive ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      {conn.name}
                    </CardTitle>
                    <CardDescription>
                      {getDatabaseTypeLabel(conn.databaseType)} - {conn.host}/{conn.database}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!conn.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveMutation.mutate({ id: conn.id })}
                        disabled={setActiveMutation.isPending}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestSaved(conn)}
                      disabled={testingId === conn.id}
                    >
                      {testingId === conn.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Testing...
                        </>
                      ) : (
                        "Test"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(conn)}
                    >
                      Edit
                    </Button>
                    {!conn.isActive && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ id: conn.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {conn.port && (
                    <div>
                      <span className="font-medium">Port:</span> {conn.port}
                    </div>
                  )}
                  {conn.username && (
                    <div>
                      <span className="font-medium">Username:</span> {conn.username}
                    </div>
                  )}
                  {conn.authMode && (
                    <div>
                      <span className="font-medium">Auth Mode:</span> {conn.authMode === "windows" ? "Windows Authentication" : "SQL Authentication"}
                    </div>
                  )}
                  {conn.domain && (
                    <div>
                      <span className="font-medium">Domain:</span> {conn.domain}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No database connections yet. Add one below to get started.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add New Connection */}
      {!isAdding ? (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add New Connection
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Add New Database Connection</CardTitle>
            <CardDescription>Configure a new database connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Result Alert */}
            {testResult && !testResult.success && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">Connection Failed</div>
                  {testResult.message}
                </AlertDescription>
              </Alert>
            )}

            {testResult && testResult.success && (
              <Alert className="border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-semibold mb-1">Connection Successful</div>
                  {testResult.serverVersion && `Server: ${testResult.serverVersion}`}
                </AlertDescription>
              </Alert>
            )}

            {/* Connection Name */}
            <div className="space-y-2">
              <Label>Connection Name *</Label>
              <Input
                placeholder="Production DB"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Database Type */}
            <div className="space-y-2">
              <Label>Database Type *</Label>
              <Select value={type} onValueChange={(v) => handleTypeChange(v as DatabaseType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sqlserver">SQL Server</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                  <SelectItem value="oracle">Oracle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Host */}
            <div className="space-y-2">
              <Label>Host *</Label>
              <Input
                placeholder={type === "sqlserver" ? "localhost or .\\SQLEXPRESS" : "localhost"}
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </div>

            {/* Port */}
            {type !== "sqlite" && (
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value))}
                />
              </div>
            )}

            {/* Database */}
            <div className="space-y-2">
              <Label>Database *</Label>
              <Input
                placeholder={type === "sqlite" ? "/path/to/database.db" : "database_name"}
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
              />
            </div>

            {/* SQL Server Authentication Mode */}
            {type === "sqlserver" && (
              <div className="space-y-2">
                <Label>Authentication Mode</Label>
                <Select value={authMode} onValueChange={(v) => setAuthMode(v as AuthMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sql">SQL Authentication</SelectItem>
                    <SelectItem value="windows">Windows Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Username */}
            {(type !== "sqlite" && authMode === "sql") && (
              <div className="space-y-2">
                <Label>Username {authMode === "sql" && "*"}</Label>
                <Input
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            {/* Password */}
            {(type !== "sqlite" && authMode === "sql") && (
              <div className="space-y-2">
                <Label>Password {authMode === "sql" && "*"}</Label>
                <Input
                  type="password"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {/* Domain (for Windows Auth) */}
            {type === "sqlserver" && authMode === "windows" && (
              <div className="space-y-2">
                <Label>Domain (optional)</Label>
                <Input
                  placeholder="DOMAIN"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleTestForm}
                disabled={testingForm || !host || !database}
                className="flex-1"
              >
                {testingForm ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {editingId ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editingId ? "Update Connection" : "Create Connection"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
