# Code Implementation Examples

**Purpose:** Concrete code examples for implementing metadata RAG integration
**Status:** Ready to implement

---

## 1. Database Helper Function (Add to server/db.ts)

Add this function to support RAG-based metadata retrieval:

```typescript
/**
 * Get metadata tables by specific IDs
 * Used by RAG-based query generation to fetch only relevant tables
 *
 * @param tableIds - Array of metadata_tables.id values
 * @returns Array of tables with all their data
 */
export async function getMetadataTablesByIds(tableIds: number[]) {
  if (!tableIds || tableIds.length === 0) return [];

  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not initialized");

  // Import inArray from drizzle-orm if not already imported
  const { inArray } = await import("drizzle-orm");

  return await dbInstance
    .select()
    .from(metadataTables)
    .where(inArray(metadataTables.id, tableIds))
    .orderBy(metadataTables.tableName);
}

/**
 * Get count of all metadata tables
 * Useful for progress tracking during RAG setup
 */
export async function getMetadataTableCount(): Promise<number> {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not initialized");

  const result = await dbInstance
    .select({ count: count() })
    .from(metadataTables)
    .limit(1);

  return result[0]?.count ?? 0;
}
```

---

## 2. Metadata RAG Indexer (New file: server/metadata-rag-indexer.ts)

Create this new file to handle embedding of metadata:

```typescript
/**
 * Metadata RAG Indexer
 *
 * Converts all D365 metadata tables into vector embeddings for semantic search
 * Run this ONCE after bulk metadata import
 *
 * Usage: npx ts-node server/metadata-rag-indexer.ts
 * Or add as admin endpoint
 */

import * as db from "./db";
import { getDefaultRAGOrchestrator } from "./rag/RAGOrchestrator";
import { metadataFields, metadataTables } from "../drizzle/schema";
import { getDb } from "./db";

interface MetadataEmbedding {
  tableId: number;
  tableName: string;
  embeddingText: string;
  fieldNames: string[];
}

/**
 * Create embedding text from a metadata table
 * Combines table name, description, and all field names
 */
async function createMetadataEmbeddingText(
  table: any, // metadataTables row
  fields: any[] // metadataFields rows
): Promise<string> {
  const fieldNamesList = fields.map(f => f.fieldName).join(", ");

  return `
    D365 Table: ${table.tableName}

    Description: ${table.description || "N/A"}

    Business Purpose: ${table.businessPurpose || "N/A"}

    Fields: ${fieldNamesList}
  `.trim();
}

/**
 * Index all metadata for RAG search
 * This process:
 * 1. Fetches all tables and their fields from DB
 * 2. Creates embedding text for each table
 * 3. Sends to embedding model (OpenAI, Ollama, etc)
 * 4. Stores embeddings in vector database
 */
export async function indexAllMetadataForRAG(): Promise<{
  success: boolean;
  tablesIndexed: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let tablesIndexed = 0;

  try {
    console.log("🚀 Starting metadata RAG indexing...");

    // Initialize RAG orchestrator
    const orchestrator = getDefaultRAGOrchestrator();

    // Get all metadata tables
    const allTables = await db.getMetadataTables();
    console.log(`📊 Found ${allTables.length} metadata tables to index`);

    // Process in batches to avoid memory issues
    const BATCH_SIZE = 100;
    for (let i = 0; i < allTables.length; i += BATCH_SIZE) {
      const batch = allTables.slice(i, Math.min(i + BATCH_SIZE, allTables.length));
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allTables.length / BATCH_SIZE);

      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} tables)`);

      // Process each table in batch
      const batchResults = await Promise.allSettled(
        batch.map(async (table) => {
          try {
            // Get fields for this table
            const fields = await db.getMetadataFieldsByTableId(table.id);

            // Create embedding text
            const embeddingText = await createMetadataEmbeddingText(table, fields);

            // Create document ID
            const documentId = `metadata_table_${table.id}`;

            // Add to vector database
            // Note: This assumes RAG orchestrator has addDocument method
            // If not, use processDocument instead
            const result = await orchestrator.processDocument(
              Buffer.from(embeddingText),
              `${table.tableName}.txt`,
              "text/plain"
            );

            console.log(
              `  ✅ Indexed: ${table.tableName} (${fields.length} fields) - Vector ID: ${result.documentId}`
            );

            return {
              tableId: table.id,
              tableName: table.tableName,
              vectorId: result.documentId,
              fieldCount: fields.length,
            };
          } catch (error) {
            const errorMsg = `Failed to index ${table.tableName}: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`  ❌ ${errorMsg}`);
            errors.push(errorMsg);
            throw error;
          }
        })
      );

      // Count successes in this batch
      const successCount = batchResults.filter(r => r.status === "fulfilled").length;
      tablesIndexed += successCount;

      console.log(`  📈 Batch complete: ${successCount}/${batch.length} successful`);
    }

    const duration = Date.now() - startTime;
    console.log(`\n✨ Metadata indexing complete!`);
    console.log(`  Total tables indexed: ${tablesIndexed}`);
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Duration: ${duration}ms (${Math.round(duration / 1000)}s)`);

    return {
      success: errors.length === 0,
      tablesIndexed,
      errors,
      duration,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error during indexing";
    console.error(`\n❌ Fatal error during indexing: ${errorMsg}`);

    return {
      success: false,
      tablesIndexed,
      errors: [...errors, errorMsg],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Get RAG indexing status
 * Returns stats about indexed metadata
 */
export async function getRagIndexingStatus(): Promise<{
  totalTables: number;
  indexedTables: number;
  lastIndexedAt: Date | null;
  indexingStatus: "not-started" | "in-progress" | "complete" | "failed";
}> {
  const orchestrator = getDefaultRAGOrchestrator();
  const totalTables = await db.getMetadataTableCount();
  const stats = await orchestrator.getStats();

  // This is a simplified implementation
  // In production, you'd track indexing state in database
  return {
    totalTables,
    indexedTables: stats.documentCount ?? 0,
    lastIndexedAt: stats.lastUpdated ?? null,
    indexingStatus: stats.documentCount === 0 ? "not-started" : "complete",
  };
}

// Run if executed directly
if (require.main === module) {
  indexAllMetadataForRAG()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export default indexAllMetadataForRAG;
```

**Usage:**

```bash
# Option 1: Run as CLI script (after build)
npx ts-node server/metadata-rag-indexer.ts

# Option 2: Add to package.json scripts
{
  "scripts": {
    "metadata:index": "ts-node server/metadata-rag-indexer.ts"
  }
}
# Then run: npm run metadata:index
```

---

## 3. Extend Knowledge Base Adapter (Update server/knowledge-base-adapter.ts)

Add this function to find relevant metadata tables:

```typescript
/**
 * Find relevant metadata tables for a natural language query
 * Uses semantic search via RAG
 */
export async function findRelevantMetadataTables(
  query: string,
  options?: {
    limit?: number;
    minRelevance?: number;
    timeout?: number;
  }
): Promise<{ tableId: number; tableName: string; relevance: number }[]> {
  const defaults = {
    limit: 50,
    minRelevance: 0.3,
    timeout: 5000,
  };

  const finalOptions = { ...defaults, ...options };

  try {
    // Get the RAG orchestrator
    const orchestrator = getDefaultRAGOrchestrator();

    // Check if RAG is available
    if (!orchestrator.isEnabled?.()) {
      console.warn(
        "[MetadataRAG] RAG not enabled, falling back to all metadata"
      );
      return []; // Signal to use all metadata
    }

    // Search for relevant documents
    // The query will be converted to vector and matched against metadata vectors
    const results = await Promise.race([
      orchestrator.search(query, {
        limit: finalOptions.limit,
        filter: { type: "metadata" }, // Filter for metadata documents
      }),
      // Timeout after specified duration
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("RAG search timeout")),
          finalOptions.timeout
        )
      ),
    ]) as any[];

    // Filter by minimum relevance and extract table info
    const relevantTables = results
      .filter((doc) => doc.relevanceScore >= finalOptions.minRelevance)
      .map((doc) => ({
        tableId: doc.metadata?.tableId || doc.id.replace("metadata_table_", ""),
        tableName: doc.metadata?.tableName || doc.title || "",
        relevance: doc.relevanceScore,
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, finalOptions.limit);

    console.log(
      `[MetadataRAG] Found ${relevantTables.length} relevant tables for query: "${query.substring(0, 50)}..."`
    );

    return relevantTables;
  } catch (error) {
    console.warn(
      `[MetadataRAG] Search failed: ${error instanceof Error ? error.message : String(error)}`
    );
    console.warn("[MetadataRAG] Returning empty list - query generation will fall back to all metadata");

    return []; // Return empty = use all metadata as fallback
  }
}

/**
 * Get metadata search statistics
 * Useful for debugging and monitoring
 */
export async function getMetadataSearchStats(): Promise<{
  totalTables: number;
  indexedTables: number;
  avgRelevanceScore?: number;
  isHealthy: boolean;
}> {
  try {
    const orchestrator = getDefaultRAGOrchestrator();
    const stats = await orchestrator.getStats();

    return {
      totalTables: stats.documentCount ?? 0,
      indexedTables: stats.documentCount ?? 0,
      isHealthy: (stats.documentCount ?? 0) > 0,
    };
  } catch (error) {
    console.error("[MetadataRAG] Health check failed:", error);
    return {
      totalTables: 0,
      indexedTables: 0,
      isHealthy: false,
    };
  }
}
```

---

## 4. Update Query Generator (Modify server/queryGenerator.ts)

Find this section (around line 10-40) and update it:

```typescript
// BEFORE (existing code):
export async function generateSqlQuery(
  naturalLanguageQuery: string,
  userSecurityRoles: string[],
  userId: number
): Promise<{ sql: string; explanation: string; error?: string }> {
  try {
    // Get all metadata tables and fields
    const tables = await db.getMetadataTables();

    if (tables.length === 0) {
      return {
        sql: "",
        explanation: "",
        error: "No metadata available. Please upload metadata first.",
      };
    }

    // ... rest of function ...
  }
}

// AFTER (with RAG integration):
import { findRelevantMetadataTables } from "./knowledge-base-adapter";

export async function generateSqlQuery(
  naturalLanguageQuery: string,
  userSecurityRoles: string[],
  userId: number
): Promise<{
  sql: string;
  explanation: string;
  error?: string;
  ragSources?: Array<{ tableId: number; tableName: string; relevance: number }>;
}> {
  try {
    let tables;
    let ragSources: any[] = [];

    // Try RAG-based metadata retrieval first
    console.log("[QueryGen] Attempting RAG-based metadata search...");
    const relevantTables = await findRelevantMetadataTables(
      naturalLanguageQuery,
      {
        limit: 50,
        minRelevance: 0.3,
      }
    );

    if (relevantTables.length > 0) {
      // Success: Use only relevant tables
      console.log(
        `[QueryGen] RAG found ${relevantTables.length} relevant tables`
      );
      const tableIds = relevantTables.map((t) =>
        typeof t.tableId === "number"
          ? t.tableId
          : parseInt(t.tableId as string, 10)
      );
      tables = await db.getMetadataTablesByIds(tableIds);
      ragSources = relevantTables;
    } else {
      // Fallback: Use all metadata if RAG returns empty
      console.log(
        "[QueryGen] RAG returned no results, falling back to all metadata"
      );
      tables = await db.getMetadataTables();
    }

    if (tables.length === 0) {
      return {
        sql: "",
        explanation: "",
        error: "No metadata available. Please upload metadata first.",
      };
    }

    // Extract table names for schema introspection
    const tableNames = tables.map((t) => t.tableName);
    const mentionedTables = extractTableNamesFromQuery(
      naturalLanguageQuery,
      tableNames
    );

    // ... rest of function stays the same, but add ragSources to return:
    // At the end of the function, return:
    return {
      sql,
      explanation,
      ragSources, // Add this line
    };
  } catch (error) {
    // ... error handling ...
  }
}
```

---

## 5. Add Admin Endpoint for RAG Indexing (Update server/routers-admin.ts)

Add this to the admin router:

```typescript
import { indexAllMetadataForRAG, getRagIndexingStatus } from "./metadata-rag-indexer";

export const adminRouter = router({
  // ... existing procedures ...

  /**
   * Trigger RAG indexing of all metadata
   * Call this AFTER bulk metadata upload completes
   */
  indexMetadataForRAG: adminProcedure.mutation(async ({ ctx }) => {
    console.log(`[Admin] User ${ctx.user.id} initiated metadata RAG indexing`);

    // Check if already indexing (optional, implement if needed)
    // const status = await getRagIndexingStatus();
    // if (status.indexingStatus === "in-progress") {
    //   throw new Error("Indexing already in progress");
    // }

    // Start indexing (this runs in background)
    const result = await indexAllMetadataForRAG();

    return {
      success: result.success,
      tablesIndexed: result.tablesIndexed,
      errorCount: result.errors.length,
      errors: result.errors,
      duration: result.duration,
    };
  }),

  /**
   * Get RAG indexing status
   */
  getRagIndexingStatus: adminProcedure.query(async ({ ctx }) => {
    return await getRagIndexingStatus();
  }),
});
```

---

## 6. Integration Test (Create server/metadata-rag.test.ts)

Test the RAG integration:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import {
  findRelevantMetadataTables,
  getMetadataSearchStats,
} from "./knowledge-base-adapter";
import { indexAllMetadataForRAG } from "./metadata-rag-indexer";
import * as db from "./db";

describe("Metadata RAG Integration", () => {
  beforeAll(async () => {
    // Ensure we have test metadata
    const count = await db.getMetadataTableCount();
    if (count === 0) {
      console.log("Skipping tests - no metadata in database");
    }
  });

  describe("findRelevantMetadataTables", () => {
    it("should find relevant tables for customer query", async () => {
      const results = await findRelevantMetadataTables("show customers", {
        limit: 10,
      });

      // Should find something (unless RAG not set up)
      if (results.length > 0) {
        expect(results[0]).toHaveProperty("tableId");
        expect(results[0]).toHaveProperty("tableName");
        expect(results[0]).toHaveProperty("relevance");
        expect(results[0].relevance).toBeGreaterThanOrEqual(0);
        expect(results[0].relevance).toBeLessThanOrEqual(1);
      }
    });

    it("should respect limit parameter", async () => {
      const results = await findRelevantMetadataTables("customer", {
        limit: 5,
      });

      if (results.length > 0) {
        expect(results.length).toBeLessThanOrEqual(5);
      }
    });

    it("should sort by relevance descending", async () => {
      const results = await findRelevantMetadataTables("balance", {
        limit: 20,
      });

      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].relevance).toBeGreaterThanOrEqual(
            results[i + 1].relevance
          );
        }
      }
    });
  });

  describe("getMetadataSearchStats", () => {
    it("should return RAG statistics", async () => {
      const stats = await getMetadataSearchStats();

      expect(stats).toHaveProperty("totalTables");
      expect(stats).toHaveProperty("indexedTables");
      expect(stats).toHaveProperty("isHealthy");
      expect(typeof stats.isHealthy).toBe("boolean");
    });
  });

  describe("indexAllMetadataForRAG", () => {
    it("should complete indexing without errors", async () => {
      // This is a slow test - only run if explicitly needed
      // Skip in CI/CD unless explicitly enabled
      if (process.env.RUN_SLOW_TESTS !== "true") {
        console.log("Skipping slow indexing test");
        expect(true).toBe(true);
        return;
      }

      const result = await indexAllMetadataForRAG();

      expect(result.success).toBe(true);
      expect(result.tablesIndexed).toBeGreaterThan(0);
      expect(result.errors.length).toEqual(0);
    });
  });
});
```

Run with: `npm run test -- metadata-rag`

---

## 7. Frontend Integration (Update client/src/pages/MetadataViewer.tsx)

Add indicator showing RAG status:

```typescript
// In your MetadataViewer component, add:

import { useEffect, useState } from "react";
import { trpc } from "../utils/trpc";

export function MetadataViewer() {
  const [ragStatus, setRagStatus] = useState<{
    isHealthy: boolean;
    indexedTables: number;
  }>({ isHealthy: false, indexedTables: 0 });

  // Add this query
  const ragStatsQuery = trpc.metadata.ragStats.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (ragStatsQuery.data) {
      setRagStatus({
        isHealthy: ragStatsQuery.data.isHealthy,
        indexedTables: ragStatsQuery.data.indexedTables,
      });
    }
  }, [ragStatsQuery.data]);

  return (
    <div>
      {/* Existing metadata viewer code */}

      {/* Add RAG status indicator */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2">
          {ragStatus.isHealthy ? (
            <div className="h-2 w-2 bg-green-500 rounded-full" />
          ) : (
            <div className="h-2 w-2 bg-yellow-500 rounded-full" />
          )}
          <span className="text-sm text-gray-700">
            {ragStatus.isHealthy
              ? `RAG Index Ready: ${ragStatus.indexedTables} tables indexed`
              : "RAG Index Not Ready - Using full metadata search"}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

- [ ] **Phase 1: Bulk Import**
  - [ ] Test uploadBulk with 100 files
  - [ ] Run full import of 11k files
  - [ ] Verify database: COUNT from metadata_tables = 11000
  - [ ] Check error logs for failed imports

- [ ] **Phase 2: RAG Setup**
  - [ ] Add getMetadataTablesByIds() to db.ts
  - [ ] Create metadata-rag-indexer.ts
  - [ ] Update knowledge-base-adapter.ts
  - [ ] Add admin endpoints for indexing

- [ ] **Phase 3: Integration**
  - [ ] Update queryGenerator.ts with RAG logic
  - [ ] Add fallback handling
  - [ ] Test with sample queries
  - [ ] Monitor token usage (should drop 10x)

- [ ] **Phase 4: Testing & Monitoring**
  - [ ] Run integration tests
  - [ ] Test edge cases (no RAG results, timeout, errors)
  - [ ] Monitor query generation performance
  - [ ] Track LLM costs before/after

---

## Key Configuration Points

### Token Limits (in queryGenerator.ts)
```typescript
// Set max context token limit
const MAX_CONTEXT_TOKENS = 4000; // Tokens for metadata context

// Calculate how many tables fit
const avgTokensPerTable = 80; // Average tokens per table
const maxTables = Math.floor(MAX_CONTEXT_TOKENS / avgTokensPerTable); // ~50 tables
```

### RAG Relevance Threshold
```typescript
// More strict (only highly relevant tables)
minRelevance: 0.5 // Only top 20-30 tables

// More lenient (include possible matches)
minRelevance: 0.2 // Include 50-100 tables
```

### Embedding Model Configuration
```typescript
// In RAGOrchestrator initialization
{
  embeddingModel: "text-embedding-3-small", // Or use Ollama for free
  vectorDatabase: "chroma", // Or your chosen vector DB
  chunkSize: 1000, // Characters per embedding
  chunkOverlap: 200, // Overlap between chunks
}
```

---

## Expected Results After Implementation

**Before RAG:**
- Context size: ~5500 KB (11,000 tables)
- Tokens per query: 200,000+
- Cost per query: $10-30
- Query time: 30-60 seconds
- Accuracy: Medium (LLM confused by too much data)

**After RAG:**
- Context size: ~100-200 KB (50-100 relevant tables)
- Tokens per query: 2,000-4,000
- Cost per query: $0.30-0.60
- Query time: 5-10 seconds
- Accuracy: High (LLM focuses on relevant data)

**Savings:**
- 10-50x cost reduction
- 5-10x speed improvement
- Significantly better accuracy

