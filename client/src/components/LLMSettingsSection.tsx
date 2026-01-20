/**
 * LLM Configuration Settings Component
 * Can be used as a standalone page or embedded in another settings page
 * Allows users to configure and manage LLM providers
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Check, X, Plus, Trash2, Settings2, Edit2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type LLMProvider = "manus_builtin" | "openai" | "azure_openai" | "custom" | "google" | "google_ai";

interface LLMConfig {
    id: number;
    provider: LLMProvider;
    model: string;
    apiKey: string | null;
    endpoint: string | null;
    deploymentName: string | null;
    temperature: number | null;
    maxTokens: number | null;
    isActive: boolean | null;
    createdAt: Date | string;
}

interface LLMSettingsSectionProps {
    isEmbedded?: boolean;
}

const ELI5 = ({ text }: { text: string }) => (
    <span className="text-xs text-muted-foreground italic">({text})</span>
);

export function LLMSettingsSection({ isEmbedded = false }: LLMSettingsSectionProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [testingId, setTestingId] = useState<number | null>(null);

    // Form state
    const [provider, setProvider] = useState<LLMProvider>("custom");
    const [model, setModel] = useState("gpt-5.1-2025-11-13");
    const [apiKey, setApiKey] = useState("");
    const [endpoint, setEndpoint] = useState("https://oneapi.laisky.com");
    const [deploymentName, setDeploymentName] = useState("");
    const [temperature, setTemperature] = useState(70);
    const [maxTokens, setMaxTokens] = useState(4000);

    // Queries
    const { data: configs, refetch } = trpc.config.getAllLlmConfigs.useQuery();
    const { data: activeConfig } = trpc.config.getActiveLlmConfig.useQuery();
    const { data: availableModels } = trpc.config.getAvailableModels.useQuery();

    // Mutations
    const createMutation = trpc.config.createLlmConfig.useMutation({
        onSuccess: () => {
            toast.success("LLM configuration created successfully");
            refetch();
            resetForm();
            setIsAdding(false);
        },
        onError: (error) => {
            toast.error(`Failed to create configuration: ${error.message}`);
        },
    });

    const updateMutation = trpc.config.updateLlmConfig.useMutation({
        onSuccess: () => {
            toast.success("Configuration updated successfully");
            refetch();
            resetForm();
            setEditingId(null);
        },
        onError: (error) => {
            toast.error(`Failed to update configuration: ${error.message}`);
        },
    });

    const deleteMutation = trpc.config.deleteLlmConfig.useMutation({
        onSuccess: () => {
            toast.success("Configuration deleted");
            refetch();
        },
        onError: (error) => {
            toast.error(`Failed to delete: ${error.message}`);
        },
    });

    const setActiveMutation = trpc.config.setActiveLlmConfig.useMutation({
        onSuccess: () => {
            toast.success("Active configuration updated");
            refetch();
        },
        onError: (error) => {
            toast.error(`Failed to set active: ${error.message}`);
        },
    });

    const testMutation = trpc.config.testLlmConfig.useMutation({
        onSuccess: (data) => {
            if (data.success) {
                toast.success(`Connection successful: ${data.message}`);
            } else {
                toast.error(`Connection failed: ${data.message}`);
            }
            setTestingId(null);
        },
        onError: (error) => {
            toast.error(`Test failed: ${error.message}`);
            setTestingId(null);
        },
    });

    const resetForm = () => {
        setProvider("custom");
        setModel("gpt-5.1-2025-11-13");
        setApiKey("");
        setEndpoint("https://oneapi.laisky.com");
        setDeploymentName("");
        setTemperature(70);
        setMaxTokens(4000);
    };

    const handleCreate = () => {
        // Validate required fields
        if (!model || model.trim().length === 0) {
            toast.error("Please select a model");
            return;
        }

        if (provider !== "manus_builtin" && (!apiKey || apiKey.trim().length === 0)) {
            toast.error("API key is required for external providers");
            return;
        }

        if ((provider === "custom" || provider === "azure_openai") && (!endpoint || endpoint.trim().length === 0)) {
            toast.error("Endpoint is required for custom providers");
            return;
        }

        if (provider === "azure_openai" && (!deploymentName || deploymentName.trim().length === 0)) {
            toast.error("Deployment name is required for Azure OpenAI");
            return;
        }

        if (provider === "google_ai" && (!apiKey || apiKey.trim().length === 0)) {
            toast.error("API key is required for Google AI Studio");
            return;
        }

        createMutation.mutate({
            provider,
            model,
            apiKey: apiKey || undefined,
            endpoint: endpoint || undefined,
            deploymentName: deploymentName || undefined,
            temperature,
            maxTokens,
        });
    };

    const handleUpdate = () => {
        if (!editingId) return;

        // Validate required fields
        if (!model || model.trim().length === 0) {
            toast.error("Please select a model");
            return;
        }

        if (provider !== "manus_builtin" && (!apiKey || apiKey.trim().length === 0)) {
            toast.error("API key is required for external providers");
            return;
        }

        if ((provider === "custom" || provider === "azure_openai") && (!endpoint || endpoint.trim().length === 0)) {
            toast.error("Endpoint is required for custom providers");
            return;
        }

        if (provider === "azure_openai" && (!deploymentName || deploymentName.trim().length === 0)) {
            toast.error("Deployment name is required for Azure OpenAI");
            return;
        }

        if (provider === "google_ai" && (!apiKey || apiKey.trim().length === 0)) {
            toast.error("API key is required for Google AI Studio");
            return;
        }

        updateMutation.mutate({
            id: editingId,
            provider,
            model,
            apiKey: apiKey || undefined,
            endpoint: endpoint || undefined,
            deploymentName: deploymentName || undefined,
            temperature,
            maxTokens,
        });
    };

    const handleEdit = (config: LLMConfig) => {
        setEditingId(config.id);
        setProvider(config.provider);
        setModel(config.model);
        setApiKey(""); // Don't show masked key, user needs to re-enter
        setEndpoint(config.endpoint || "");
        setDeploymentName(config.deploymentName || "");
        setTemperature(config.temperature || 70);
        setMaxTokens(config.maxTokens || 4000);
        setIsAdding(true);
    };

    const handleTest = (config: LLMConfig) => {
        setTestingId(config.id);
        testMutation.mutate({
            id: config.id,
            provider: config.provider,
            model: config.model,
            apiKey: config.apiKey || undefined,
            endpoint: config.endpoint || undefined,
            deploymentName: config.deploymentName || undefined,
        });
    };

    const getProviderLabel = (provider: LLMProvider) => {
        switch (provider) {
            case "manus_builtin":
                return "Manus Built-in";
            case "openai":
                return "OpenAI";
            case "azure_openai":
                return "Azure OpenAI";
            case "google":
                return "Google Gemini";
            case "google_ai":
                return "Google AI Studio";
            case "custom":
                return "Custom Provider";
        }
    };

    const containerClass = isEmbedded ? "" : "container max-w-4xl py-8";

    return (
        <div className={containerClass}>
            {!isEmbedded && (
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">LLM Configuration</h1>
                    <p className="text-muted-foreground mt-2">
                        Configure language model providers for query generation and natural language processing
                    </p>
                </div>
            )}

            {!isEmbedded && (
                <Alert className="mb-6">
                    <Settings2 className="h-4 w-4" />
                    <AlertDescription>
                        Configure which language model provider to use for query generation and analysis.
                    </AlertDescription>
                </Alert>
            )}

            {/* Active Configuration */}
            {activeConfig && (
                <Card className="mb-6 border-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-primary" />
                            Currently Active
                        </CardTitle>
                        <CardDescription>This model is currently active for query processing</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Model:</span> {activeConfig.model}
                            </div>
                            <div>
                                <span className="font-medium">Provider:</span> {getProviderLabel(activeConfig.provider)}
                            </div>
                            <div>
                                <span className="font-medium">Temperature:</span> {activeConfig.temperature} <span className="text-xs text-muted-foreground">(0=precise, 100=creative)</span>
                            </div>
                            <div>
                                <span className="font-medium">Max Tokens:</span> {activeConfig.maxTokens}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Existing Configurations */}
            <div className="space-y-4 mb-6">
                <h2 className="text-lg font-semibold">Saved Configurations</h2>
                {configs && configs.length > 0 ? (
                    configs.map((config) => (
                        <Card key={config.id} className={config.isActive ? "border-primary border-2" : ""}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {getProviderLabel(config.provider)}
                                            {config.isActive && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">ACTIVE</span>}
                                        </CardTitle>
                                        <CardDescription>{config.model}</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        {!config.isActive && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setActiveMutation.mutate({ id: config.id })}
                                                disabled={setActiveMutation.isPending}
                                            >
                                                Use This
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(config)}
                                            disabled={editingId === config.id}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTest(config)}
                                            disabled={testingId === config.id}
                                        >
                                            {testingId === config.id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    Testing...
                                                </>
                                            ) : (
                                                "Test"
                                            )}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                if (config.isActive) {
                                                    toast.error("Cannot delete the active configuration");
                                                    return;
                                                }
                                                if (confirm("Delete this configuration?")) {
                                                    deleteMutation.mutate({ id: config.id });
                                                }
                                            }}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                    {config.endpoint && (
                                        <div>
                                            <span className="font-medium">Endpoint:</span>
                                            <br />
                                            {config.endpoint}
                                        </div>
                                    )}
                                    {config.deploymentName && (
                                        <div>
                                            <span className="font-medium">Deployment:</span>
                                            <br />
                                            {config.deploymentName}
                                        </div>
                                    )}
                                    <div>
                                        <span className="font-medium">Temperature:</span> {config.temperature}
                                    </div>
                                    <div>
                                        <span className="font-medium">Max Tokens:</span> {config.maxTokens}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            No AI configurations saved yet. Create one below to get started.
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Add/Edit Configuration */}
            {!isAdding ? (
                <Button onClick={() => {
                    setEditingId(null);
                    resetForm();
                    setIsAdding(true);
                }} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    {editingId ? "Update Configuration" : "Add New AI Configuration"}
                </Button>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>{editingId ? "Edit AI Configuration" : "Add New AI Configuration"}</CardTitle>
                        <CardDescription>
                            {editingId ? "Update your AI assistant setup" : "Set up a new AI assistant"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Provider Selection */}
                        <div className="space-y-2">
                            <Label>Provider</Label>
                            <Select value={provider} onValueChange={(v) => setProvider(v as LLMProvider)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">Custom Provider (e.g., Laisky)</SelectItem>
                                    <SelectItem value="manus_builtin">Manus Built-in</SelectItem>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="azure_openai">Azure OpenAI</SelectItem>
                                    <SelectItem value="google_ai">Google AI Studio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Model Selection */}
                        <div className="space-y-2">
                            <Label>Model</Label>
                            {provider === "manus_builtin" ? (
                                <Input value="manus-default" disabled />
                            ) : provider === "custom" ? (
                                <>
                                    <Select value={model} onValueChange={setModel}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableModels?.map((m: any) => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{m.name}</span>
                                                        {m.recommended && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Best</span>}
                                                        {m.warning && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">⚠️ {m.warning}</span>}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {/* Model pricing info */}
                                    {availableModels && (() => {
                                        const selectedModel = availableModels.find((m: any) => m.id === model) as any;
                                        if (selectedModel?.pricing) {
                                            return (
                                                <div className="text-xs text-muted-foreground mt-2 p-3 bg-slate-50 rounded">
                                                    <div className="font-medium mb-1">💵 Cost per 1 million words:</div>
                                                    <div className="flex justify-between">
                                                        <span>Input (you asking): ${selectedModel.pricing.input}</span>
                                                        <span>Output (AI answering): ${selectedModel.pricing.output}</span>
                                                    </div>
                                                    {selectedModel.warning && (
                                                        <div className="text-yellow-600 mt-2">⚠️ {selectedModel.warning}</div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </>
                            ) : provider === "openai" ? (
                                <Select value={model} onValueChange={setModel}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gpt-4">GPT-4 (most advanced)</SelectItem>
                                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo (faster)</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (cheapest)</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : provider === "google_ai" ? (
                                <Select value={model} onValueChange={setModel}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                                        <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</SelectItem>
                                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                                        <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                                        <SelectItem value="gemini-1.0-pro">Gemini 1.0 Pro</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    placeholder="e.g., gpt-4-deployment"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                />
                            )}
                        </div>

                        {/* API Key (for all except Manus built-in) */}
                        {provider !== "manus_builtin" && (
                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                    type="password"
                                    placeholder={editingId ? "Leave blank to keep existing key" : "Enter your API key"}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Required to authenticate with the provider</p>
                            </div>
                        )}

                        {/* Endpoint (for Custom and Azure) */}
                        {(provider === "custom" || provider === "azure_openai") && (
                            <div className="space-y-2">
                                <Label>Endpoint URL</Label>
                                <Input
                                    placeholder={provider === "custom" ? "https://oneapi.laisky.com" : "https://your-resource.openai.azure.com"}
                                    value={endpoint}
                                    onChange={(e) => setEndpoint(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Azure-specific fields */}
                        {provider === "azure_openai" && (
                            <div className="space-y-2">
                                <Label>Deployment Name</Label>
                                <Input
                                    placeholder="e.g., gpt-4-deployment"
                                    value={deploymentName}
                                    onChange={(e) => setDeploymentName(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Temperature */}
                        <div className="space-y-2">
                            <Label>Temperature (0-100)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseInt(e.target.value))}
                                    className="flex-1"
                                />
                                <span className="text-sm font-medium w-12 text-center">{temperature}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                0-30: Precise responses | 50-70: Balanced | 80+: Creative
                            </p>
                        </div>

                        {/* Max Tokens */}
                        <div className="space-y-2">
                            <Label>Max Tokens</Label>
                            <Input
                                type="number"
                                min="100"
                                max="32000"
                                value={maxTokens}
                                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Max response length. Use 2000-4000 for most queries.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                            <Button
                                onClick={editingId ? handleUpdate : handleCreate}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="flex-1"
                            >
                                {createMutation.isPending || updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        {editingId ? "Updating..." : "Creating..."}
                                    </>
                                ) : (
                                    editingId ? "Update Configuration" : "Create Configuration"
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
