/**
 * Metadata RAG Indexer
 *
 * Indexes all D365 metadata tables into vectors for semantic search
 * Uses LM Studio for embeddings (running at http://127.0.0.1:1234)
 * Uses Chroma as vector store
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import * as db from './db';

// Ollama Configuration
const LM_STUDIO_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
// Using 'nomic-embed-text' which is efficient for RAG
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
const VECTOR_STORE_FILE = path.resolve(process.cwd(), 'server/database/rag-vectors.json');

interface VectorRecord {
    tableId: number;
    tableName: string;
    description: string;
    vector: number[];
}

/**
 * Generate embedding for text using LM Studio
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await axios.post(
            `${LM_STUDIO_URL}/v1/embeddings`,
            {
                model: EMBEDDING_MODEL,
                input: text,
            },
            { timeout: 30000 }
        );

        if (response.data?.data?.[0]?.embedding) {
            return response.data.data[0].embedding;
        }

        throw new Error('No embedding returned from LM Studio');
    } catch (error: any) {
        if (error.response?.status === 400 && error.response?.data?.error?.includes('No models loaded')) {
            console.error(`[RAG Indexer] ❌ CRITICAL: No embedding model loaded in LM Studio`);
            console.error(`[RAG Indexer] Please load model: ${EMBEDDING_MODEL}`);
            console.error(`[RAG Indexer] Steps: Open LM Studio → Developer tab → Search & load the model`);
            throw new Error(`LM Studio has no models loaded. Please load: ${EMBEDDING_MODEL}`);
        }
        console.error(`[RAG Indexer] Embedding error for text: "${text.substring(0, 50)}..."`);
        throw error;
    }
}

/**
 * Create or update in-memory vector store (Chroma-compatible)
 */
class ChromaVectorStore {
    private vectors: Map<number, VectorRecord> = new Map();
    private tableName: string;

    constructor() {
        this.tableName = 'metadata_vectors';
    }

    async add(record: VectorRecord): Promise<void> {
        this.vectors.set(record.tableId, record);
    }

    async addBatch(records: VectorRecord[]): Promise<void> {
        for (const record of records) {
            this.vectors.set(record.tableId, record);
        }
    }

    /**
     * Search for similar vectors (cosine similarity)
     */
    async search(queryVector: number[], limit: number = 10): Promise<VectorRecord[]> {
        const results: { record: VectorRecord; similarity: number }[] = [];

        for (const record of this.vectors.values()) {
            const similarity = this.cosineSimilarity(queryVector, record.vector);
            results.push({ record, similarity });
        }

        // Sort by similarity (descending) and return top results
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(r => r.record);
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            throw new Error('Vector dimensions must match');
        }

        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            magnitudeA += vecA[i] * vecA[i];
            magnitudeB += vecB[i] * vecB[i];
        }

        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);

        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }

        return dotProduct / (magnitudeA * magnitudeB);
    }

    async clear(): Promise<void> {
        this.vectors.clear();
    }

    async count(): Promise<number> {
        return this.vectors.size;
    }

    getAll(): VectorRecord[] {
        return Array.from(this.vectors.values());
    }

    /**
     * Persistence helpers
     */
    async saveToDisk(filePath: string = VECTOR_STORE_FILE): Promise<void> {
        const payload = JSON.stringify(this.getAll());
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, payload, 'utf-8');
    }

    async loadFromDisk(filePath: string = VECTOR_STORE_FILE): Promise<number> {
        try {
            const buf = await fs.promises.readFile(filePath, 'utf-8');
            const items: VectorRecord[] = JSON.parse(buf);
            if (Array.isArray(items) && items.length > 0) {
                await this.addBatch(items);
                return items.length;
            }
            return 0;
        } catch (err) {
            return 0; // No file yet or parse error; ignore
        }
    }
}

// Global instance
let vectorStore: ChromaVectorStore | null = null;
let storeLoadedFromDisk = false;

export function getVectorStore(): ChromaVectorStore {
    if (!vectorStore) {
        vectorStore = new ChromaVectorStore();
        // Attempt to load persisted vectors once on initialization
        if (!storeLoadedFromDisk) {
            vectorStore.loadFromDisk().then((loaded) => {
                if (loaded > 0) {
                    console.log(`[RAG Indexer] Loaded ${loaded} vectors from disk`);
                }
                storeLoadedFromDisk = true;
            }).catch(() => {
                storeLoadedFromDisk = true;
            });
        }
    }
    return vectorStore;
}

/**
 * Index all metadata tables for RAG search
 * Call this ONCE after bulk import to prepare metadata for semantic search
 */
export async function indexAllMetadataForRAG(onProgress?: (current: number, total: number) => void): Promise<{
    indexed: number;
    failed: number;
    duration: number;
}> {
    const startTime = Date.now();
    const store = getVectorStore();

    try {
        // Get all tables from metadata
        const tables = await db.getMetadataTables();
        console.log(`[RAG Indexer] Starting to index ${tables.length} metadata tables...`);

        let indexed = 0;
        let failed = 0;

        // Index tables in batches to avoid overwhelming LM Studio
        const BATCH_SIZE = 5;
        for (let i = 0; i < tables.length; i += BATCH_SIZE) {
            const batch = tables.slice(i, i + BATCH_SIZE);

            // Generate embeddings in parallel for this batch
            const batchPromises = batch.map(async (table) => {
                try {
                    // Create embedding text from table metadata
                    const fields = await db.getMetadataFieldsByTableId(table.id);
                    const relationships = await db.getRelationshipsByTableId(table.id);

                    const fieldSummary = fields
                        .slice(0, 10) // Use top 10 fields
                        .map(f => `${f.fieldName}(${f.fieldType})`)
                        .join(', ');

                    const relationshipSummary = relationships
                        .slice(0, 5)
                        .map(r => `${r.relationName}→${r.relatedTable}`)
                        .join(', ');

                    const embeddingText = `Table: ${table.tableName}
Description: ${table.description || 'No description'}
Fields: ${fieldSummary}
Relationships: ${relationshipSummary}`;

                    // Generate embedding
                    const embedding = await generateEmbedding(embeddingText);

                    // Store in vector store
                    await store.add({
                        tableId: table.id,
                        tableName: table.tableName,
                        description: table.description || '',
                        vector: embedding,
                    });

                    indexed++;
                    return { success: true, tableName: table.tableName };
                } catch (error) {
                    failed++;
                    console.error(`[RAG Indexer] Failed to index ${table.tableName}:`, error);
                    return { success: false, tableName: table.tableName, error };
                }
            });

            const results = await Promise.allSettled(batchPromises);

            // Report progress with actual indexed count
            const processedCount = i + batch.length;
            onProgress?.(indexed, tables.length);
            console.log(`[RAG Indexer] Progress: ${processedCount}/${tables.length} tables processed (indexed: ${indexed}, failed: ${failed})`);

            // Small delay between batches
            if (i + BATCH_SIZE < tables.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        const duration = Date.now() - startTime;
        console.log(`[RAG Indexer] Indexing complete! Indexed: ${indexed}, Failed: ${failed}, Duration: ${duration}ms`);

        // Persist vectors to disk for faster future startups
        try {
            await store.saveToDisk();
            console.log('[RAG Indexer] Persisted vector store to disk');
        } catch (persistErr) {
            console.warn('[RAG Indexer] Failed to persist vector store:', persistErr);
        }

        return { indexed, failed, duration };
    } catch (error) {
        console.error('[RAG Indexer] Critical error during indexing:', error);
        throw error;
    }
}

/**
 * Extract keywords from query for keyword-aware ranking
 */
function extractKeywords(query: string): string[] {
    // Split by common delimiters and filter stop words
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'is', 'how', 'what', 'when', 'where', 'why', 'which', 'from', 'on', 'by', 'be']);
    return query
        .toLowerCase()
        .split(/\s+/)
        .filter(w => !stopWords.has(w) && w.length > 2);
}

/**
 * Boost similarity score if table name/description matches keywords
 * Example: query "vendors" → VendTable gets boosted
 */
function boostByKeyword(
    tableName: string,
    description: string,
    keywords: string[],
): number {
    const text = `${tableName} ${description}`.toLowerCase();
    let boost = 1.0;

    for (const keyword of keywords) {
        // Exact word match in table name: +30%
        if (tableName.toLowerCase().includes(keyword)) {
            boost *= 1.3;
        }
        // Partial match in description: +10%
        if (description.toLowerCase().includes(keyword)) {
            boost *= 1.1;
        }
    }

    return Math.min(boost, 1.5); // Cap boost at 50%
}

/**
 * Search for relevant metadata tables using semantic search + keyword boosting
 * Returns top N tables that match the query semantically AND keyword-wise
 */
export async function searchMetadataByQuery(
    query: string,
    limit: number = 10
): Promise<Array<{ tableId: number; tableName: string; description: string; similarity: number; matchedKeywords: string[] }>> {
    try {
        const store = getVectorStore();

        // Check if store has any vectors
        const count = await store.count();
        if (count === 0) {
            console.warn('[RAG Search] Vector store is empty. Run indexAllMetadataForRAG first.');
            return [];
        }

        // Generate query embedding
        const queryEmbedding = await generateEmbedding(query);

        // Search vector store (get more results so we can re-rank)
        const rawResults = await store.search(queryEmbedding, Math.min(limit * 2, 50));

        // Extract keywords from query
        const keywords = extractKeywords(query);

        // Boost and re-rank by keyword matching
        const boostedResults = rawResults.map(record => {
            const baseSimilarity = cosineSimilaritySync(queryEmbedding, record.vector);
            const keywordBoost = boostByKeyword(record.tableName, record.description, keywords);
            const boostedSimilarity = Math.min(baseSimilarity * keywordBoost, 1.0);

            // Track which keywords matched
            const matchedKeywords = keywords.filter(
                k => record.tableName.toLowerCase().includes(k) || record.description.toLowerCase().includes(k)
            );

            return {
                tableId: record.tableId,
                tableName: record.tableName,
                description: record.description,
                similarity: boostedSimilarity,
                matchedKeywords,
            };
        });

        // Sort by boosted similarity and return top N
        return boostedResults
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    } catch (error) {
        console.error('[RAG Search] Error searching metadata:', error);
        throw error;
    }
}

/**
 * Synchronous cosine similarity (helper)
 */
function cosineSimilaritySync(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Get statistics about the indexed metadata
 */
export async function getIndexStats(): Promise<{
    indexed: number;
    total: number;
    totalIndexed: number; // alias for indexed (backward compat)
    ready: boolean;
    embeddingModel: string;
    persisted: boolean;
    progress: number; // percentage 0-100
}> {
    const store = getVectorStore();
    const count = await store.count();

    // Get total tables count from database
    let totalTables = 0;
    try {
        const tables = await db.getMetadataTables();
        totalTables = tables.length;
    } catch {
        // If DB not ready, estimate from store
        totalTables = count;
    }

    const progress = totalTables > 0 ? Math.round((count / totalTables) * 100) : 0;

    return {
        indexed: count,
        total: totalTables,
        totalIndexed: count, // backward compat
        ready: count > 0 && count >= totalTables * 0.5, // Ready when 50%+ indexed
        embeddingModel: EMBEDDING_MODEL,
        persisted: fs.existsSync(VECTOR_STORE_FILE),
        progress,
    };
}
