/**
 * Embedding Provider - Abstract interface for generating text embeddings
 * 
 * What are embeddings?
 * - Vector representations of text that capture semantic meaning
 * - Similar texts have similar vectors (measured by cosine similarity)
 * - Used for semantic search and retrieval
 * 
 * Why provider abstraction?
 * - Easy to switch between different embedding models
 * - Support both local (no API) and cloud-based (API) providers
 * - Different models have different trade-offs (speed, quality, cost)
 * 
 * Supported Providers:
 * - Local: Xenova Transformers (runs in Node.js, no API needed)
 * - Cloud: OpenAI, Cohere, etc. (requires API keys)
 */

/**
 * Embedding vector - array of numbers representing text semantics
 */
export type EmbeddingVector = number[];

/**
 * Result of embedding generation
 */
export interface EmbeddingResult {
  /** The embedding vector */
  embedding: EmbeddingVector;
  /** Dimension of the embedding vector */
  dimension: number;
  /** Model used to generate the embedding */
  model: string;
}

/**
 * Abstract embedding provider interface
 * All embedding providers must implement this interface
 */
export interface EmbeddingProvider {
  /** Provider name for identification */
  readonly name: string;

  /** Model name/identifier */
  readonly model: string;

  /** Dimension of embedding vectors produced by this provider */
  readonly dimension: number;

  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @returns Embedding result with vector and metadata
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Generate embeddings for multiple texts in batch
   * More efficient than calling embed() multiple times
   * @param texts - Array of texts to embed
   * @returns Array of embedding results
   */
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;

  /**
   * Check if provider is ready to use
   * For local models: check if model is loaded
   * For API providers: check if API key is configured
   */
  isReady(): Promise<boolean>;
}

/**
 * Xenova Transformers Provider (Local, No API Required)
 * 
 * Uses @xenova/transformers to run embedding models locally in Node.js
 * - No API key required
 * - Runs on CPU (slower than GPU but no external dependencies)
 * - Good for development and demos
 * - Model: all-MiniLM-L6-v2 (384 dimensions, fast, good quality)
 */
export class XenovaEmbeddingProvider implements EmbeddingProvider {
  readonly name = "xenova";
  readonly model = "Xenova/all-MiniLM-L6-v2";
  readonly dimension = 384;

  private pipeline: any = null;
  private loading = false;

  /**
   * Initialize the embedding pipeline
   * Downloads model on first use (cached for subsequent uses)
   */
  private async initPipeline() {
    if (this.pipeline) return;
    if (this.loading) {
      // Wait for loading to complete
      while (this.loading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this.loading = true;
    try {
      const { pipeline } = await import("@xenova/transformers");
      this.pipeline = await pipeline("feature-extraction", this.model);
    } finally {
      this.loading = false;
    }
  }

  async isReady(): Promise<boolean> {
    try {
      await this.initPipeline();
      return this.pipeline !== null;
    } catch {
      return false;
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    await this.initPipeline();

    if (!this.pipeline) {
      throw new Error("Embedding pipeline not initialized");
    }

    // Generate embedding
    const output = await this.pipeline(text, {
      pooling: "mean",
      normalize: true,
    });

    // Convert tensor to array
    const embedding: number[] = Array.from(output.data);

    return {
      embedding,
      dimension: this.dimension,
      model: this.model,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    await this.initPipeline();

    if (!this.pipeline) {
      throw new Error("Embedding pipeline not initialized");
    }

    // Process texts in parallel
    const results = await Promise.all(texts.map((text) => this.embed(text)));

    return results;
  }
}

/**
 * OpenAI Embedding Provider (Cloud API)
 * 
 * Uses OpenAI's embedding API
 * - Requires OpenAI API key
 * - High quality embeddings
 * - Fast (runs on OpenAI's GPUs)
 * - Model: text-embedding-3-small (1536 dimensions)
 * 
 * Note: This is a placeholder implementation
 * Actual implementation would use the OpenAI SDK
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";
  readonly model = "text-embedding-3-small";
  readonly dimension = 1536;

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isReady(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // TODO: Implement actual OpenAI API call
    // For now, throw error indicating this is not yet implemented
    throw new Error(
      "OpenAI embedding provider not yet implemented. Use Xenova provider for now."
    );
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // TODO: Implement actual OpenAI API batch call
    throw new Error(
      "OpenAI embedding provider not yet implemented. Use Xenova provider for now."
    );
  }
}

/**
 * Embedding provider factory
 * Creates the appropriate provider based on configuration
 */
export type EmbeddingProviderType = "xenova" | "openai";

export interface EmbeddingProviderConfig {
  type: EmbeddingProviderType;
  apiKey?: string; // Required for cloud providers
}

/**
 * Create an embedding provider instance
 * 
 * @param config - Provider configuration
 * @returns Configured embedding provider
 */
export function createEmbeddingProvider(
  config: EmbeddingProviderConfig
): EmbeddingProvider {
  switch (config.type) {
    case "xenova":
      return new XenovaEmbeddingProvider();

    case "openai":
      if (!config.apiKey) {
        throw new Error("OpenAI API key required for OpenAI provider");
      }
      return new OpenAIEmbeddingProvider(config.apiKey);

    default:
      throw new Error(`Unknown embedding provider type: ${config.type}`);
  }
}

/**
 * Default embedding provider (Xenova - no API required)
 */
let defaultProvider: EmbeddingProvider | null = null;

/**
 * Get or create the default embedding provider
 */
export async function getDefaultEmbeddingProvider(): Promise<EmbeddingProvider> {
  if (!defaultProvider) {
    defaultProvider = createEmbeddingProvider({ type: "xenova" });
    await defaultProvider.isReady();
  }
  return defaultProvider;
}
