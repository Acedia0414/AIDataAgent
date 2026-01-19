import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, ChevronRight, CheckCircle2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { MetadataTree } from "@/components/MetadataTree";
import { RelationshipVisualizer } from "@/components/RelationshipVisualizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";

export default function Metadata() {
  const { user, loading: authLoading } = useAuth();
  const [metadataContent, setMetadataContent] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [activeTab, setActiveTab] = useState("upload");
  const [ragQuery, setRagQuery] = useState("");
  const { data: ragSearch, refetch: refetchRagSearch, isFetching: ragSearching } = trpc.metadata.searchMetadata.useQuery({ query: ragQuery, limit: 20 }, { enabled: false });

  // RAG indexing status - poll every 5 seconds when on RAG tab
  const { data: ragStats, refetch: refetchRagStats } = trpc.metadata.getRagStats.useQuery(undefined, {
    enabled: activeTab === 'ragsearch',
    refetchInterval: activeTab === 'ragsearch' ? 5000 : false,
  });

  const { data: tables, refetch } = trpc.metadata.listTables.useQuery(undefined, {
    enabled: !!user,
  });

  const uploadMetadata = trpc.metadata.upload.useMutation({
    onMutate: () => {
      setUploadProgress(0);
      setUploadStage("Parsing XML...");
    },
    onSuccess: (data) => {
      if (data.success) {
        const relCount = (data as any).relationshipsCount || 0;
        const message = `Successfully processed table: ${(data as any).tableName} with ${(data as any).fieldsCount} fields${relCount > 0 ? ` and ${relCount} relationships` : ''}`;
        toast.success(message);
        refetch();
      } else {
        toast.error("Metadata validation failed");
        data.errors.forEach((err: string) => toast.error(err));
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
      setUploadProgress(0);
      setUploadStage(null);
    },
  });

  const uploadBulkChunked = trpc.metadata.uploadBulkChunked.useMutation({
    onSuccess: (data) => {
      // Update progress based on chunks processed
      const chunkProgress = ((data.chunkIndex + 1) / data.totalChunks) * 100;
      setUploadProgress(chunkProgress);
      setCurrentFileIndex(data.chunkIndex + 1);
      setUploadStage(`Processing chunk ${data.chunkIndex + 1}/${data.totalChunks} - ${data.tablesProcessed} tables processed`);

      if (data.isLastChunk) {
        setUploadProgress(100);
        setUploadStage("All chunks processed!");

        const totalErrors = data.totalErrors ?? data.errors?.length ?? 0;

        if (data.success) {
          const refinedMsg = data.totalRefinedRelationships ? ` ${data.totalRefinedRelationships} relationships refined.` : '';
          toast.success(
            `Successfully processed ${data.tablesProcessed} total tables. ${data.created} created, ${data.replaced} replaced.${refinedMsg}`
          );
          if (totalErrors > 0) {
            toast.error(`Completed with ${totalErrors} errors (showing first ${Math.min(totalErrors, data.errors.length)}):`);
            data.errors.forEach((err: string) => toast.error(err));
          }
          setSelectedFiles([]);
          setMetadataContent("");
          refetch();
        } else if (totalErrors > 0) {
          toast.error(`Upload failed for ${totalErrors} files (showing first ${Math.min(totalErrors, data.errors.length)}):`);
          data.errors.forEach((err: string) => toast.error(err));
        }

        setTimeout(() => {
          setUploadProgress(0);
          setUploadStage(null);
          setCurrentFileIndex(0);
          setTotalFiles(0);
        }, 3000);
      }
    },
    onError: (error: any) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploadProgress(0);
      setUploadStage(null);
    },
  });

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

  const handleUpload = () => {
    if (!metadataContent.trim()) {
      toast.error("Please enter metadata content");
      return;
    }

    uploadMetadata.mutate({
      content: metadataContent,
      replaceExisting,
    });
  };

  const handleBulkUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    const CHUNK_SIZE = 100; // Process 100 files per chunk
    const totalChunks = Math.ceil(selectedFiles.length / CHUNK_SIZE);
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalReplaced = 0;

    setUploadProgress(5);
    setUploadStage(`Starting upload of ${selectedFiles.length} files in ${totalChunks} chunks...`);
    setTotalFiles(selectedFiles.length);

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedFiles.length);
        const chunkFiles = selectedFiles.slice(start, end);

        // Read only this chunk's files
        const fileContents: { filename: string; content: string }[] = [];
        setUploadStage(`Reading chunk ${chunkIndex + 1}/${totalChunks} (${chunkFiles.length} files)...`);

        for (const file of chunkFiles) {
          const content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsText(file);
          });
          fileContents.push({ filename: file.name, content });
        }

        // Upload this chunk
        setUploadStage(`Uploading chunk ${chunkIndex + 1}/${totalChunks}...`);

        await uploadBulkChunked.mutateAsync({
          files: fileContents,
          chunkIndex,
          totalChunks,
          replaceExisting, // Use the user's checkbox selection for this import batch
        });

        // Clear memory for this chunk
        fileContents.length = 0;
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Check console for details.");
      setUploadProgress(0);
      setUploadStage(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload & Manage</TabsTrigger>
            <TabsTrigger value="visualizer">Relationship Graph</TabsTrigger>
            <TabsTrigger value="ragsearch">RAG Search</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload Metadata</CardTitle>
                  <CardDescription>
                    Upload D365 F&O table and field metadata to enable intelligent query generation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="file-upload" className="block text-sm font-medium mb-2">
                        Upload D365 XML Metadata Files (Multiple files supported)
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".xml"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            setSelectedFiles(files);
                            // If single file, also load it into the textarea
                            if (files.length === 1) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const content = event.target?.result as string;
                                setMetadataContent(content);
                              };
                              reader.readAsText(files[0]);
                            } else {
                              setMetadataContent("");
                            }
                          }
                        }}
                        className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      cursor-pointer"
                      />
                      {selectedFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium text-slate-700">
                            Selected {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}:
                          </p>
                          <div className="max-h-32 overflow-y-auto">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 px-2 py-1 rounded">
                                <span>{file.name}</span>
                                <button
                                  onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          {selectedFiles.length > 1 && (
                            <Button
                              onClick={handleBulkUpload}
                              disabled={uploadBulkChunked.isPending}
                              className="w-full mt-2"
                            >
                              {uploadBulkChunked.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing {currentFileIndex + 1} of {totalFiles}
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Upload {selectedFiles.length} Files
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded-md">
                      <p className="font-medium mb-1">Supported Format:</p>
                      <p>D365 F&O AxTable XML files from:</p>
                      <code className="text-xs bg-white px-2 py-1 rounded mt-1 block">
                        K:\AosService\PackagesLocalDirectory\[Module]\Foundation\AxTable\[TableName].xml
                      </code>
                    </div>
                  </div>
                  <Textarea
                    value={metadataContent}
                    onChange={(e) => setMetadataContent(e.target.value)}
                    placeholder="Paste D365 XML content here or use the file upload above..."
                    className="min-h-[200px] max-h-[300px] font-mono text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="replace"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="replace" className="text-sm">
                      Replace existing metadata
                    </label>
                  </div>
                  {(uploadStage || uploadBulkChunked.isPending) && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm font-medium">
                          {uploadStage || `Processing ${currentFileIndex + 1} of ${totalFiles} files...`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Progress value={uploadProgress} className="h-3" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-mono">{uploadProgress}% complete</span>
                          <span>{currentFileIndex + 1} / {totalFiles} files</span>
                        </div>
                      </div>
                      {totalFiles > 1 && (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2 bg-white rounded border">
                            <div className="text-muted-foreground">Files</div>
                            <div className="font-mono font-semibold">{Math.min(currentFileIndex + 1, totalFiles)}/{totalFiles}</div>
                          </div>
                          <div className="p-2 bg-white rounded border">
                            <div className="text-muted-foreground">Progress</div>
                            <div className="font-mono font-semibold">{uploadProgress}%</div>
                          </div>
                          <div className="p-2 bg-white rounded border">
                            <div className="text-muted-foreground">Status</div>
                            <div className="font-mono font-semibold text-blue-600">Active</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMetadata.isPending || !metadataContent.trim() || selectedFiles.length > 1}
                    className="w-full"
                  >
                    {uploadMetadata.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : uploadProgress === 100 ? (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {selectedFiles.length > 1 ? "Use Bulk Upload Above" :
                      uploadProgress === 100 ? "Upload Complete" : "Upload Single File/Text"}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Existing Metadata</CardTitle>
                  <CardDescription>
                    {tables?.length || 0} tables configured
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-auto">
                    {tables?.map((table: any) => (
                      <MetadataTableItem key={table.id} table={table} />
                    ))}
                    {(!tables || tables.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No metadata uploaded yet. Upload metadata to get started.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Format Guide */}
            <Collapsible>
              <Card className="mt-6">
                <CardHeader>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                      <CardTitle>Metadata Format Guide</CardTitle>
                      <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Table Section</h4>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>TABLE: (Required) Table name</li>
                        <li>DESCRIPTION: (Optional) Table description</li>
                        <li>BUSINESS_PURPOSE: (Optional) Business purpose</li>
                        <li>CODE_LAYER: (Optional) Code layer information</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Field Section</h4>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>FIELD: (Required) Field name</li>
                        <li>TYPE: (Required) Field data type</li>
                        <li>DESCRIPTION: (Optional) Field description</li>
                        <li>BUSINESS_MEANING: (Optional) Business meaning</li>
                        <li>PRIMARY_KEY: (Optional) true/false</li>
                        <li>FOREIGN_KEY: (Optional) true/false</li>
                        <li>REFERENCED_TABLE: (Optional) Referenced table name</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Separators</h4>
                      <p className="text-muted-foreground">
                        Use <code className="bg-muted px-1 py-0.5 rounded">---</code> to separate multiple tables
                      </p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </TabsContent>

          <TabsContent value="visualizer">
            {tables && tables.length > 0 ? (
              <RelationshipVisualizer
                tables={tables.map((t: any) => ({
                  id: t.id.toString(),
                  name: t.tableName,
                  fieldCount: 0, // Will be populated from actual metadata
                }))}
                relationships={[]} // Will be populated from actual relationship data
              />
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <p>No metadata available for visualization.</p>
                    <p className="mt-2">Upload metadata first to see the relationship graph.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="ragsearch">
            <Card>
              <CardHeader>
                <CardTitle>RAG Semantic Search</CardTitle>
                <CardDescription>Type a phrase to find related tables. RAG interprets your query and returns semantically similar tables with explanation.</CardDescription>

                {/* RAG Indexing Status */}
                {ragStats && (
                  <div className={`mt-4 p-3 rounded-lg border ${ragStats.ready ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {ragStats.ready ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        )}
                        <span className={`text-sm font-medium ${ragStats.ready ? 'text-green-800' : 'text-amber-800'}`}>
                          {ragStats.ready ? 'RAG Index Ready' : 'RAG Indexing in Progress'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ragStats.embeddingModel}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={ragStats.progress || 0} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {ragStats.indexed || 0} / {ragStats.total || 0} tables ({ragStats.progress || 0}%)
                      </span>
                    </div>
                    {!ragStats.ready && (
                      <p className="text-xs text-amber-700 mt-2">
                        Query generation will use keyword-based fallback until indexing completes.
                      </p>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded px-3 py-2 text-sm"
                    placeholder="e.g., customer invoices and payment status"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && ragQuery.trim() && !ragSearching) {
                        refetchRagSearch();
                      }
                    }}
                  />
                  <Button onClick={() => refetchRagSearch()} disabled={!ragQuery.trim() || ragSearching}>
                    {ragSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Search
                  </Button>
                </div>

                {ragSearch && (
                  <div className="space-y-4">
                    {/* Query Interpretation */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-xs font-semibold text-blue-900 mb-1">Query Interpretation:</div>
                      <div className="text-sm text-blue-800">
                        <span className="font-mono">"{ragQuery}"</span> → Searching for {ragSearch.count} semantically similar table{ragSearch.count !== 1 ? 's' : ''} using embeddings
                      </div>
                    </div>

                    {/* Results Summary */}
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">Found {ragSearch.count} result{ragSearch.count !== 1 ? 's' : ''}</div>
                      {ragSearch.count > 0 && (
                        <Badge variant="outline" className="text-xs">Top matches shown</Badge>
                      )}
                    </div>

                    {/* Results List */}
                    <div className="space-y-2">
                      {ragSearch.results.map((r: any) => (
                        <div
                          key={`${r.tableId}-${r.tableName}`}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono font-semibold text-sm text-slate-900 break-all">
                                {r.tableName}
                              </div>
                              {r.description && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                  <span className="font-semibold">Context:</span> {r.description}
                                </p>
                              )}
                              <div className="text-xs text-slate-500 mt-1">
                                <span className="font-semibold">Why matched:</span> Semantic similarity to your query. Use the View button to explore fields and relationships.
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                                {(r.similarity * 100).toFixed(0)}% match
                              </div>
                              <Link href={`/metadata-viewer?table=${encodeURIComponent(r.tableName)}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}

                      {ragSearch.results.length === 0 && ragQuery.trim() && (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          <div className="mb-2">No matching tables found</div>
                          <div className="text-xs">Try a different query or check that metadata has been indexed via the Admin panel</div>
                        </div>
                      )}
                    </div>

                    {/* Footer Note */}
                    {ragSearch.count > 0 && (
                      <div className="text-xs text-muted-foreground p-3 bg-slate-50 rounded border border-slate-200">
                        <strong>Note:</strong> These results are based on semantic similarity of your query to table descriptions. Not all results may be directly relevant. Use "View Details" to inspect table schema and decide if fields match your needs.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs >
      </div >
    </div >
  );
}

function MetadataTableItem({ table }: { table: any }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: metadataResponse, isLoading } = trpc.metadata.getTableMetadataV2.useQuery(
    { tableName: table.tableName },
    { enabled: isOpen }
  );

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="border rounded-lg">
      <Button
        variant="ghost"
        className="w-full justify-between"
        onClick={handleToggle}
      >
        <span className="font-mono">{table.tableName}</span>
        <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </Button>
      {isOpen && (
        <div className="p-4 border-t bg-muted/20">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {metadataResponse?.data && <MetadataTree metadata={metadataResponse.data} />}
        </div>
      )}
    </div>
  );
}
