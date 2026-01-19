import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Check, Terminal, FolderOpen, ChevronDown, ChevronRight, Download, Loader2, FileText, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export interface MetadataCommandModalProps {
    tables: string[];
    onImportComplete?: () => void;
    onSchemaContext?: (context: string) => void;  // Callback to add schema context to conversation
}

// Group tables by common D365 prefixes for better organization
function groupTablesByPrefix(tables: string[]): Record<string, string[]> {
    const prefixMap: Record<string, string[]> = {
        Vend: [],
        Cust: [],
        Purch: [],
        Sales: [],
        Invent: [],
        Ledger: [],
        Proj: [],
        Asset: [],
        Bank: [],
        HRM: [],
        Other: [],
    };

    for (const table of tables) {
        let matched = false;
        for (const prefix of Object.keys(prefixMap)) {
            if (prefix !== 'Other' && table.startsWith(prefix)) {
                prefixMap[prefix].push(table);
                matched = true;
                break;
            }
        }
        if (!matched) {
            prefixMap.Other.push(table);
        }
    }

    // Remove empty groups
    return Object.fromEntries(
        Object.entries(prefixMap).filter(([_, v]) => v.length > 0)
    );
}

export function MetadataCommandModal({ tables, onImportComplete, onSchemaContext }: MetadataCommandModalProps) {
    const [copiedStep, setCopiedStep] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [isImporting, setIsImporting] = useState(false);
    const [isLoadingContext, setIsLoadingContext] = useState(false);
    const [schemaContext, setSchemaContext] = useState<string | null>(null);

    const quickImport = trpc.metadata.quickImport.useMutation({
        onSuccess: (data) => {
            setIsImporting(false);
            if (data.success) {
                toast.success(`Imported ${data.imported}/${data.total} tables successfully!`);
                // Show details of failed imports if any
                const failed = data.results.filter(r => !r.success);
                if (failed.length > 0) {
                    toast.warning(`${failed.length} tables not found: ${failed.map(f => f.tableName).join(', ')}`);
                }
                onImportComplete?.();
            } else {
                toast.error("Import failed - no tables imported");
            }
        },
        onError: (error) => {
            setIsImporting(false);
            toast.error(`Import failed: ${error.message}`);
        },
    });

    const getSchemaContext = trpc.metadata.getSchemaContext.useMutation({
        onSuccess: (data) => {
            setIsLoadingContext(false);
            if (data.success && data.context) {
                setSchemaContext(data.context);
                toast.success(`Loaded schema context for ${data.found}/${data.total} tables`);
                if (data.found < data.total) {
                    toast.warning(`${data.total - data.found} tables not found in Ax/AxTable`);
                }
            } else {
                toast.error("Failed to load schema context");
            }
        },
        onError: (error) => {
            setIsLoadingContext(false);
            toast.error(`Schema context failed: ${error.message}`);
        },
    });

    const handleQuickImport = () => {
        setIsImporting(true);
        quickImport.mutate({ tableNames: tables });
    };

    const handleGetSchemaContext = () => {
        setIsLoadingContext(true);
        setSchemaContext(null);
        getSchemaContext.mutate({ tableNames: tables });
    };

    const handleCopySchemaContext = async () => {
        if (!schemaContext) return;
        try {
            await navigator.clipboard.writeText(schemaContext);
            toast.success("Schema context copied to clipboard!");
        } catch {
            toast.error("Failed to copy schema context");
        }
    };

    const handleAddToConversation = () => {
        if (!schemaContext) return;
        onSchemaContext?.(schemaContext);
        toast.success("Schema context added to conversation!");
    };

    const groups = groupTablesByPrefix(tables);

    // Generate commands
    const tablePattern = tables.join('|');
    const findCmd = `fd -e xml "^(${tablePattern})\\.xml$" Ax/AxTable/`;
    const copyCmd = `fd -e xml "^(${tablePattern})\\.xml$" Ax/AxTable/ -x cp -fv {} /tmp/`;
    const openCmd = `open /tmp/`;
    const allInOneCmd = `${copyCmd} && ${openCmd}`;

    const handleCopy = async (text: string, stepName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedStep(stepName);
            toast.success(`${stepName} command copied!`);
            setTimeout(() => setCopiedStep(null), 2000);
        } catch {
            toast.error("Failed to copy command");
        }
    };

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Terminal className="h-4 w-4" />
                    <span>Get {tables.length} metadata files</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        Copy Metadata Files ({tables.length} tables)
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Grouped tables display */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Tables needed:</p>
                        <div className="bg-muted rounded-lg p-3 space-y-1">
                            {Object.entries(groups).map(([group, groupTables]) => (
                                <div key={group}>
                                    <button
                                        onClick={() => toggleGroup(group)}
                                        className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 w-full text-left"
                                    >
                                        {expandedGroups[group] ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                        {group} ({groupTables.length})
                                    </button>
                                    {expandedGroups[group] && (
                                        <div className="ml-5 flex flex-wrap gap-1 mt-1">
                                            {groupTables.map(t => (
                                                <code key={t} className="text-xs bg-white px-1.5 py-0.5 rounded border">
                                                    {t}
                                                </code>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Import - Primary Action */}
                    <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-semibold text-blue-800">🚀 Quick Import from Server</span>
                                <p className="text-xs text-blue-600 mt-0.5">Import these tables directly from Ax/AxTable folder</p>
                            </div>
                            <Button
                                size="sm"
                                variant="default"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={handleQuickImport}
                                disabled={isImporting}
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-1" />
                                        Import {tables.length} Tables
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Get Schema Context - for adding to conversation */}
                    <div className="border-2 border-purple-300 bg-purple-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-semibold text-purple-800">📋 Get Schema Context</span>
                                <p className="text-xs text-purple-600 mt-0.5">Extract condensed schema info to add to conversation</p>
                            </div>
                            <Button
                                size="sm"
                                variant="default"
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={handleGetSchemaContext}
                                disabled={isLoadingContext}
                            >
                                {isLoadingContext ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <ScrollText className="h-4 w-4 mr-1" />
                                        Get Context
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Show schema context when loaded */}
                        {schemaContext && (
                            <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    {onSchemaContext && (
                                        <Button
                                            size="sm"
                                            variant="default"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={handleAddToConversation}
                                        >
                                            <FileText className="h-4 w-4 mr-1" />
                                            Add to Conversation
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopySchemaContext}
                                    >
                                        <Copy className="h-4 w-4 mr-1" />
                                        Copy
                                    </Button>
                                </div>
                                <div className="bg-white rounded border max-h-64 overflow-y-auto">
                                    <pre className="text-xs p-3 whitespace-pre-wrap font-mono">
                                        {schemaContext}
                                    </pre>
                                </div>
                                <p className="text-xs text-purple-600">
                                    {(schemaContext.length / 1024).toFixed(1)} KB of condensed schema info
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Manual copy commands (collapsed by default) */}
                    <details className="group">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                            <ChevronRight className="h-4 w-4 group-open:rotate-90 transition-transform" />
                            Manual: Copy files via terminal
                        </summary>
                        <div className="mt-3 space-y-3 pl-2 border-l-2">
                            {/* Quick action - All in one */}
                            <div className="border border-green-200 bg-green-50 rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-green-800">⚡ Copy all & open folder</span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-green-600 text-green-700 hover:bg-green-100"
                                        onClick={() => handleCopy(allInOneCmd, 'All-in-one')}
                                    >
                                        {copiedStep === 'All-in-one' ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                                        Copy
                                    </Button>
                                </div>
                                <pre className="text-xs bg-white/80 p-2 rounded overflow-x-auto font-mono text-green-900">
                                    {allInOneCmd}
                                </pre>
                            </div>

                            {/* Step by step */}
                            <div className="space-y-2">
                                {/* Step 1: Find */}
                                <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">1️⃣ Find files</span>
                                        <Button size="sm" variant="ghost" className="h-6" onClick={() => handleCopy(findCmd, 'Find')}>
                                            {copiedStep === 'Find' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                    <pre className="text-xs bg-muted p-1.5 rounded overflow-x-auto font-mono">{findCmd}</pre>
                                </div>

                                {/* Step 2: Copy */}
                                <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">2️⃣ Copy to /tmp/</span>
                                        <Button size="sm" variant="ghost" className="h-6" onClick={() => handleCopy(copyCmd, 'Copy')}>
                                            {copiedStep === 'Copy' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                    <pre className="text-xs bg-muted p-1.5 rounded overflow-x-auto font-mono">{copyCmd}</pre>
                                </div>

                                {/* Step 3: Open */}
                                <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">3️⃣ Open folder</span>
                                        <Button size="sm" variant="ghost" className="h-6" onClick={() => handleCopy(openCmd, 'Open')}>
                                            {copiedStep === 'Open' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                    <pre className="text-xs bg-muted p-1.5 rounded overflow-x-auto font-mono">{openCmd}</pre>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                💡 Uses <code>fd</code> for fast search. Install with <code>brew install fd</code>
                            </p>
                        </div>
                    </details>
                </div>
            </DialogContent>
        </Dialog>
    );
}
