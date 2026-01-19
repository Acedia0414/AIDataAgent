import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Database, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RAGProgress() {
  const { user, loading: authLoading } = useAuth();
  const { data: documents, isLoading: docsLoading } = trpc.knowledgeBase.list.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.knowledgeBase.stats.useQuery();

  if (authLoading || docsLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>RAG System Overview</AlertTitle>
          <AlertDescription>
            Monitor the Retrieval Augmented Generation (RAG) system status, including document processing,
            embedding generation, and vector storage. The RAG system enhances query responses with relevant
            context from your uploaded knowledge base documents.
          </AlertDescription>
        </Alert>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalDocuments || 0}</div>
              <p className="text-xs text-muted-foreground">
                Processed and indexed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Text Chunks</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalChunks || 0}</div>
              <p className="text-xs text-muted-foreground">
                Stored in vector database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Embedding Model</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono">{stats?.embeddingModel || "N/A"}</div>
              <p className="text-xs text-muted-foreground">
                Local model (no API required)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>
              Current RAG system configuration and component status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Embedding Provider</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {stats?.embeddingModel || "Xenova Transformers (Local)"}
                </p>
                <p className="text-xs text-muted-foreground ml-6">
                  No external API required - embeddings generated locally
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Vector Store</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {stats?.vectorStore || "In-Memory"}
                </p>
                <p className="text-xs text-muted-foreground ml-6">
                  Swappable with Pinecone, Weaviate, or Chroma
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Document Processors</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  PDF, DOCX, XLSX, TXT, MD
                </p>
                <p className="text-xs text-muted-foreground ml-6">
                  Automatic format detection and text extraction
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Text Chunking</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  Configurable size and overlap
                </p>
                <p className="text-xs text-muted-foreground ml-6">
                  Optimized for semantic coherence
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Processing Log */}
        <Card>
          <CardHeader>
            <CardTitle>Document Processing Log</CardTitle>
            <CardDescription>
              History of all processed documents with detailed statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.filename}</span>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                            {doc.status}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground ml-6">
                          Document ID: {doc.documentId}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-6 pt-2 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground">File Size</div>
                        <div className="text-sm font-medium">
                          {(doc.fileSize / 1024).toFixed(2)} KB
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Chunks</div>
                        <div className="text-sm font-medium">{doc.chunkCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Characters</div>
                        <div className="text-sm font-medium">
                          {doc.charCount?.toLocaleString() || "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Processing Time</div>
                        <div className="text-sm font-medium">{doc.processingTime}ms</div>
                      </div>
                    </div>

                    {doc.errorMessage && (
                      <div className="ml-6 mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        <strong>Error:</strong> {doc.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents processed yet</p>
                <p className="text-sm mt-2">
                  Upload documents from the Knowledge Base page to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How RAG Works */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How RAG Works</CardTitle>
            <CardDescription>
              Understanding the Retrieval Augmented Generation pipeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <div className="font-medium">Document Upload</div>
                  <div className="text-sm text-muted-foreground">
                    Upload PDF, Word, Excel, or text documents containing business logic, policies, or domain knowledge
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <div className="font-medium">Text Extraction & Chunking</div>
                  <div className="text-sm text-muted-foreground">
                    Extract text content and split into smaller chunks (typically 500-1000 characters) with overlap for context preservation
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <div className="font-medium">Embedding Generation</div>
                  <div className="text-sm text-muted-foreground">
                    Convert each chunk into a vector embedding using local AI models (no external API required)
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <div className="font-medium">Vector Storage</div>
                  <div className="text-sm text-muted-foreground">
                    Store embeddings in a vector database for fast similarity search
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  5
                </div>
                <div>
                  <div className="font-medium">Query-Time Retrieval</div>
                  <div className="text-sm text-muted-foreground">
                    When you ask a question, find the most relevant document chunks using semantic similarity search
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  6
                </div>
                <div>
                  <div className="font-medium">Context Augmentation</div>
                  <div className="text-sm text-muted-foreground">
                    Inject retrieved chunks into the AI prompt along with database metadata to generate more accurate SQL queries
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
