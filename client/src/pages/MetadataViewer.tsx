import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileCode2, Database, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";
import { MetadataTree } from "@/components/MetadataTree";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedMetadata {
  tableName: string;
  description: string;
  businessPurpose: string;
  fields: Array<{
    fieldName: string;
    dataType: string;
    sqlType: string;
    extendedDataType: string | null;
    description: string;
    isMandatory: boolean;
    allowEdit: boolean;
    enumType: string | null;
    label: string | null;
    translatedLabel: string | null;
  }>;
  fieldGroups: Array<{
    groupName: string;
    label: string | null;
    translatedLabel: string | null;
    fields: string[];
  }>;
  relationships: Array<{
    relationName: string;
    relatedTable: string;
    cardinality?: string;
    relationshipType?: string;
    onDelete?: string;
    constraints: Array<{
      name: string;
      sourceField: string;
      relatedField: string;
      sourceEDT?: string;
    }>;
  }>;
  methods: Array<{
    methodName: string;
    returnType: string | null;
    parameters: string[];
    summary: string;
    isDisplay: boolean;
    isStatic: boolean;
  }>;
  stats: {
    totalFields: number;
    totalFieldGroups: number;
    totalRelationships: number;
    totalMethods: number;
  };
}

export default function MetadataViewer() {
  const { user, loading: authLoading } = useAuth();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Load all tables from database
  const { data: tables, isLoading: tablesLoading } = trpc.metadata.getTables.useQuery();

  // Load selected table metadata
  const { data: tableMetadata, isLoading: metadataLoading } = trpc.metadata.getTableMetadataV2.useQuery(
    { tableName: selectedTable! },
    { enabled: !!selectedTable }
  );

  // On mount, check if table is provided via query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
      setSelectedTable(decodeURIComponent(tableParam));
    }
  }, []);

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

  const parsedData = tableMetadata?.success ? (tableMetadata.data as ParsedMetadata) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar: Table List */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5" />
                  Metadata Tables
                </CardTitle>
                <CardDescription>
                  {tables?.length || 0} tables configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tablesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : tables && tables.length > 0 ? (
                  <div className="space-y-1">
                    {tables.map((table) => (
                      <button
                        key={table.id}
                        onClick={() => setSelectedTable(table.tableName)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${selectedTable === table.tableName
                            ? "bg-blue-100 text-blue-900 font-medium"
                            : "hover:bg-slate-100 text-slate-700"
                          }`}
                      >
                        <ChevronRight className={`h-4 w-4 transition-transform ${selectedTable === table.tableName ? "rotate-90" : ""
                          }`} />
                        {table.tableName}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No metadata tables found. Please upload D365 XML metadata files in the{" "}
                      <a href="/metadata" className="text-blue-600 hover:underline">
                        Metadata Management
                      </a>{" "}
                      page.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Tree View */}
          <div className="col-span-9">
            {metadataLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
              </Card>
            ) : parsedData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode2 className="h-5 w-5" />
                    {parsedData.tableName}
                  </CardTitle>
                  <CardDescription>
                    {parsedData.description || "D365 F&O table architecture"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MetadataTree metadata={parsedData} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Database className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-slate-600 mb-2">
                    Select a table from the left to view its architecture
                  </p>
                  <p className="text-sm text-slate-500">
                    Visual Studio-style tree structure with fields, relationships, and methods
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
