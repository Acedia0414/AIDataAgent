import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";

export default function KnowledgeBase() {
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  // Queries
  const documentsQuery = trpc.knowledgeBase.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const statsQuery = trpc.knowledgeBase.stats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const formatsQuery = trpc.knowledgeBase.supportedFormats.useQuery();

  // Mutations
  const uploadMutation = trpc.knowledgeBase.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded and processed successfully");
      documentsQuery.refetch();
      statsQuery.refetch();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const deleteMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted successfully");
      documentsQuery.refetch();
      statsQuery.refetch();
      setDeleteDocId(null);
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(",")[1]; // Remove data:...;base64, prefix

        await uploadMutation.mutateAsync({
          filename: file.name,
          mimeType: file.type,
          fileData: base64Content,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (documentId: string) => {
    setDeleteDocId(documentId);
  };

  const confirmDelete = async () => {
    if (!deleteDocId) return;
    await deleteMutation.mutateAsync({ documentId: deleteDocId });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the knowledge base</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Navigation />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsQuery.data?.totalDocuments || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Chunks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsQuery.data?.totalChunks || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Embedding Model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {statsQuery.data?.embeddingModel || "Loading..."}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Vector Store</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium capitalize">
                {statsQuery.data?.vectorStore || "Loading..."}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Document
            </CardTitle>
            <CardDescription>
              Upload documents to build the AI's knowledge base. Supported formats:{" "}
              {formatsQuery.data?.join(", ") || "Loading..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept={formatsQuery.data?.join(",") || "*"}
                onChange={handleFileSelect}
                disabled={uploading}
                className="flex-1"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Select File
                  </>
                )}
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How RAG Works:</strong> Documents are processed using Retrieval Augmented
                Generation. Text is extracted, split into chunks, converted to embeddings, and
                stored for semantic search. When you ask questions, relevant chunks are
                automatically retrieved and provided to the AI for better context-aware responses.
                <br />
                <br />
                <strong>Supported formats:</strong> PDF, Word (.docx), Excel (.xlsx, .xls), Text
                (.txt), Markdown (.md)
                <br />
                <strong>Maximum file size:</strong> 10MB
                <br />
                <strong>Current stack:</strong> Xenova embeddings (local, no API needed) + In-memory
                vector store
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uploaded Documents
            </CardTitle>
            <CardDescription>
              Manage your knowledge base documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documentsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : documentsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No documents uploaded yet. Upload your first document to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentsQuery.data?.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.filename}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.fileType}</Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>{doc.chunkCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={doc.status === "completed" ? "default" : "destructive"}
                          className="gap-1"
                        >
                          {doc.status === "completed" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDate(doc.uploadedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.documentId)}
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDocId !== null} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This will remove all associated
              chunks from the knowledge base. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
