/**
 * Prompt Viewer Modal
 *
 * Displays prompt file content in a modal for review.
 * Allows users to see what prompts are being used by the system.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PromptViewerModalProps {
    open: boolean;
    onClose: () => void;
    filename: string;
}

export function PromptViewerModal({ open, onClose, filename }: PromptViewerModalProps) {
    const [copied, setCopied] = useState(false);

    // Fetch prompt content
    const { data: content, isLoading, error } = trpc.prompts.getContent.useQuery(
        { filename },
        { enabled: open && !!filename }
    );

    const handleCopy = async () => {
        if (content) {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            toast.success("Prompt copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <span>prompts/{filename}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-2 mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        disabled={!content}
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        {copied ? "Copied!" : "Copy"}
                    </Button>
                    <span className="text-xs text-gray-500">
                        Edit this file at: <code className="bg-gray-100 px-1 rounded">prompts/{filename}</code>
                    </span>
                </div>

                <ScrollArea className="h-[60vh] border rounded-lg p-4 bg-gray-50">
                    {isLoading && (
                        <div className="flex items-center justify-center h-32 text-gray-500">
                            Loading prompt...
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center justify-center h-32 text-red-500">
                            Error loading prompt: {error.message}
                        </div>
                    )}
                    {content && (
                        <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
                            {content}
                        </pre>
                    )}
                </ScrollArea>

                <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
