import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Database, CheckCircle, XCircle, AlertCircle, Save, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

interface ConnectionCredentials {
  id?: number;
  type: 'sqlserver' | 'mysql' | 'postgresql' | 'sqlite' | 'oracle';
  name: string;
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  filepath?: string;
  serviceName?: string;
  authenticationMode?: 'sql' | 'windows';
  domain?: string;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
}

const DEFAULT_PORTS: Record<string, number> = {
  sqlserver: 1433,
  mysql: 3306,
  postgresql: 5432,
  oracle: 1521,
  sqlite: 0,
};

export default function ConnectionTest() {
  const { user, loading: authLoading } = useAuth();

  const [credentials, setCredentials] = useState<ConnectionCredentials>({
    type: 'sqlserver',
    name: "My D365 Database",
    host: "",
    database: "",
    username: "",
    password: "",
    port: 1433,
    encrypt: true,
    trustServerCertificate: false,
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
    serverVersion?: string;
    databaseName?: string;
  } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [hasActiveConnection, setHasActiveConnection] = useState(false);

  // Load active connection from database
  const { data: activeConnection, refetch: refetchConnection } = trpc.azureSql.getActiveConnection.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (activeConnection) {
      setCredentials({
        id: activeConnection.id,
        name: activeConnection.name,
        type: activeConnection.databaseType as any,
        host: activeConnection.host || "",
        port: activeConnection.port || DEFAULT_PORTS[activeConnection.databaseType],
        database: activeConnection.database,
        username: activeConnection.username || "",
        password: activeConnection.password || "",
        encrypt: true,
        trustServerCertificate: false,
      });
      setHasActiveConnection(true);
      setIsEditing(false);
    } else {
      setHasActiveConnection(false);
      setIsEditing(true);
    }
  }, [activeConnection]);

  const testConnection = trpc.azureSql.testConnectionDirect.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setTestResult({
          success: true,
          message: "Connection successful!",
          details: 'message' in data ? data.message : undefined,
          serverVersion: 'serverVersion' in data ? data.serverVersion : undefined,
          databaseName: 'databaseName' in data ? data.databaseName : undefined,
        });
        toast.success("Database connection successful!");
      } else {
        setTestResult({
          success: false,
          message: "Connection failed",
          details: data.error,
        });
        toast.error("Connection failed. Check the error details below.");
      }
    },
    onError: (error) => {
      setTestResult({
        success: false,
        message: "Connection test failed",
        details: error.message,
      });
      toast.error("Connection test failed");
    },
  });

  const saveConnection = trpc.azureSql.saveConnection.useMutation({
    onSuccess: () => {
      toast.success("Connection saved successfully!");
      setHasActiveConnection(true);
      setIsEditing(false);
      refetchConnection();
    },
    onError: (error) => {
      toast.error(`Failed to save connection: ${error.message}`);
    },
  });

  const updateConnection = trpc.azureSql.updateConnection.useMutation({
    onSuccess: () => {
      toast.success("Connection updated successfully!");
      setIsEditing(false);
      refetchConnection();
    },
    onError: (error) => {
      toast.error(`Failed to update connection: ${error.message}`);
    },
  });

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    testConnection.mutate(credentials);
  };

  const handleSave = () => {
    if (credentials.id) {
      // Update existing connection
      updateConnection.mutate(credentials as any);
    } else {
      // Save new connection
      saveConnection.mutate(credentials as any);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setTestResult(null);
  };

  const handleCancel = () => {
    if (activeConnection) {
      // Restore from active connection
      setCredentials({
        id: activeConnection.id,
        name: activeConnection.name,
        type: activeConnection.databaseType as any,
        host: activeConnection.host || "",
        port: activeConnection.port || DEFAULT_PORTS[activeConnection.databaseType],
        database: activeConnection.database,
        username: activeConnection.username || "",
        password: activeConnection.password || "",
        encrypt: true,
        trustServerCertificate: false,
      });
      setIsEditing(false);
      setTestResult(null);
    }
  };

  const handleTypeChange = (type: string) => {
    const newType = type as ConnectionCredentials['type'];
    setCredentials({
      ...credentials,
      type: newType,
      port: DEFAULT_PORTS[newType],
      filepath: newType === 'sqlite' ? credentials.filepath : undefined,
      serviceName: newType === 'oracle' ? credentials.serviceName : undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isSQLite = credentials.type === 'sqlite';
  const isOracle = credentials.type === 'oracle';
  const isSQLServer = credentials.type === 'sqlserver';
  const isTestSuccessful = testResult?.success === true;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Connection Status Banner */}
        {hasActiveConnection && !isEditing && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Active Connection</AlertTitle>
            <AlertDescription className="text-green-800">
              Connected to <strong>{credentials.name}</strong> ({credentials.database} on {credentials.host})
            </AlertDescription>
          </Alert>
        )}

        {!hasActiveConnection && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Active Connection</AlertTitle>
            <AlertDescription>
              Configure and test your database connection below, then save it for use across the application.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Database Connection</CardTitle>
                <CardDescription>
                  {isEditing 
                    ? "Configure your database connection settings" 
                    : "View current connection settings"}
                </CardDescription>
              </div>
              {hasActiveConnection && !isEditing && (
                <Button onClick={handleEdit} variant="outline" size="sm">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Connection Name *</Label>
                <Input
                  id="name"
                  value={credentials.name}
                  onChange={(e) => setCredentials({ ...credentials, name: e.target.value })}
                  placeholder="My D365 Database"
                  required
                  disabled={!isEditing}
                />
                <p className="text-sm text-muted-foreground">
                  A friendly name to identify this connection
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Database Type *</Label>
                <Select 
                  value={credentials.type} 
                  onValueChange={handleTypeChange}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select database type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sqlserver">SQL Server / Azure SQL</SelectItem>
                    <SelectItem value="mysql">MySQL / MariaDB</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="sqlite">SQLite</SelectItem>
                    <SelectItem value="oracle">Oracle Database</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isSQLite ? (
                <div className="space-y-2">
                  <Label htmlFor="filepath">Database File Path *</Label>
                  <Input
                    id="filepath"
                    value={credentials.filepath || ""}
                    onChange={(e) => setCredentials({ ...credentials, filepath: e.target.value })}
                    placeholder="/path/to/database.db"
                    required
                    disabled={!isEditing}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="host">Host / Server Name *</Label>
                    <Input
                      id="host"
                      value={credentials.host || ""}
                      onChange={(e) => setCredentials({ ...credentials, host: e.target.value })}
                      placeholder={isSQLServer ? "your-server.database.windows.net" : "localhost"}
                      required
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={credentials.port || DEFAULT_PORTS[credentials.type]}
                      onChange={(e) => setCredentials({ ...credentials, port: parseInt(e.target.value) || DEFAULT_PORTS[credentials.type] })}
                      placeholder={DEFAULT_PORTS[credentials.type].toString()}
                      disabled={!isEditing}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="database">Database Name *</Label>
                <Input
                  id="database"
                  value={credentials.database}
                  onChange={(e) => setCredentials({ ...credentials, database: e.target.value })}
                  placeholder={isSQLite ? "main" : "D365_AXDB"}
                  required
                  disabled={!isEditing}
                />
              </div>

              {!isSQLite && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={credentials.username || ""}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      placeholder="admin"
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={credentials.password || ""}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="••••••••"
                      disabled={!isEditing}
                    />
                  </div>
                </>
              )}

              {/* Test Result */}
              {testResult && (
                <Alert className={testResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertTitle className={testResult.success ? "text-green-900" : "text-red-900"}>
                    {testResult.message}
                  </AlertTitle>
                  {testResult.details && (
                    <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                      {testResult.details}
                    </AlertDescription>
                  )}
                  {testResult.serverVersion && (
                    <AlertDescription className="text-green-800 mt-2">
                      <strong>Server Version:</strong> {testResult.serverVersion}
                    </AlertDescription>
                  )}
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {isEditing && (
                  <>
                    <Button
                      type="submit"
                      disabled={testConnection.isPending}
                      className="flex-1"
                    >
                      {testConnection.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>

                    {isTestSuccessful && (
                      <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saveConnection.isPending || updateConnection.isPending}
                        variant="default"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {(saveConnection.isPending || updateConnection.isPending) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Connection
                          </>
                        )}
                      </Button>
                    )}

                    {hasActiveConnection && (
                      <Button
                        type="button"
                        onClick={handleCancel}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    )}
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Connection Help</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>Azure SQL Database:</strong>
              <p className="text-muted-foreground mt-1">
                Server: your-server.database.windows.net | Port: 1433 | Enable encryption
              </p>
            </div>
            <div>
              <strong>Local SQL Server:</strong>
              <p className="text-muted-foreground mt-1">
                Server: localhost or (local) or .\\SQLEXPRESS | Port: 1433
              </p>
            </div>
            <div>
              <strong>Security Note:</strong>
              <p className="text-muted-foreground mt-1">
                Credentials are encrypted and stored securely in the database. Only you can access your saved connections.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
