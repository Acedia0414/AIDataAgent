import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export function RAGAdmin() {
    const [isIndexing, setIsIndexing] = useState(false);
    const [indexProgress, setIndexProgress] = useState(0);
    const [indexMessage, setIndexMessage] = useState('');

    // Queries
    const { data: ragStats, refetch: refetchStats } = trpc.metadata.getRagStats.useQuery(undefined, {
        refetchInterval: isIndexing ? 2000 : 30000,
    });

    // Mutations
    const indexMutation = trpc.metadata.indexForRag.useMutation({
        onMutate: () => {
            setIsIndexing(true);
            setIndexProgress(0);
            setIndexMessage('Starting indexing...');
        },
        onSuccess: (data) => {
            setIndexProgress(100);
            setIndexMessage(`✅ Indexing complete! Indexed: ${data.indexed}, Failed: ${data.failed}`);
            toast.success(`RAG indexing complete: ${data.indexed} tables indexed in ${(data.duration / 1000).toFixed(1)}s`);
            setTimeout(() => {
                setIsIndexing(false);
                setIndexMessage('');
                setIndexProgress(0);
                refetchStats();
            }, 2000);
        },
        onError: (error: any) => {
            setIsIndexing(false);
            setIndexMessage(`❌ Error: ${error.message}`);
            toast.error(`Indexing failed: ${error.message}`);
        },
    });

    const handleIndexAll = () => {
        if (window.confirm('Start indexing all metadata for RAG? This may take a few minutes.')) {
            indexMutation.mutate();
        }
    };

    const isReady = ragStats?.ready;
    const totalIndexed = ragStats?.totalIndexed || 0;

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {isReady ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-yellow-600" />}
                    RAG Indexing Control
                </CardTitle>
                <CardDescription>
                    {isReady
                        ? `${totalIndexed} tables indexed and ready for semantic search`
                        : 'No tables indexed yet. Index your metadata to enable semantic table selection.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Status Section */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-gray-600">Status</div>
                        <div className="font-semibold text-lg">
                            {isReady ? '🟢 Ready' : '🔴 Not Indexed'}
                        </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-gray-600">Tables Indexed</div>
                        <div className="font-semibold text-lg">{totalIndexed.toLocaleString()}</div>
                    </div>
                </div>

                {/* Embedding Model */}
                {ragStats?.embeddingModel && (
                    <div className="p-3 bg-slate-100 rounded-lg text-sm">
                        <div className="text-gray-600">Embedding Model</div>
                        <div className="font-mono text-xs break-all">{ragStats.embeddingModel}</div>
                    </div>
                )}

                {/* Indexing Progress */}
                {isIndexing && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm font-medium">{indexMessage}</span>
                        </div>
                        <Progress value={indexProgress} className="h-2" />
                    </div>
                )}

                {indexMessage && !isIndexing && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        {indexMessage}
                    </div>
                )}

                {/* Action Button */}
                <Button
                    onClick={handleIndexAll}
                    disabled={isIndexing || indexMutation.isPending}
                    className="w-full"
                >
                    {isIndexing || indexMutation.isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Indexing in progress...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {isReady ? 'Reindex All Metadata' : 'Index All Metadata'}
                        </>
                    )}
                </Button>

                {/* Info */}
                <div className="p-3 bg-blue-50 rounded-lg text-xs text-gray-700 space-y-1">
                    <p className="font-semibold">What does this do?</p>
                    <p>
                        RAG (Retrieval-Augmented Generation) creates vector embeddings of all your metadata tables.
                        This enables semantic search—when users ask questions, the system automatically finds the most relevant tables instead of using all {totalIndexed || 3000}+ tables.
                    </p>
                    <p className="mt-2 font-semibold text-gray-800">Result: Better SQL queries, faster generation.</p>
                </div>
            </CardContent>
        </Card>
    );
}
