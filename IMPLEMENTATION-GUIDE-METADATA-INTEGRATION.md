# Implementation Guide: Metadata Integration

**Document:** Step-by-step action plan for integrating 11k XML metadata files
**Current Date:** January 12, 2026

---

## PART 1: Bulk Import (Starting Point)

### What You Need to Do NOW

You have **two pathways**:

#### Pathway A: If you have 11k XML files ready
1. Call the existing `uploadBulk` endpoint
2. Monitor progress
3. Verify import success

#### Pathway B: If you need to understand the format first
1. Test with a small batch (10-100 files)
2. Verify the import works
3. Scale up to 11k

### The uploadBulk Endpoint (Already Built)

**Location:** `server/routers.ts` line ~170

**What it does:**
```typescript
POST /api/trpc/metadata.uploadBulk
Input: {
  files: [
    { filename: "CustTable.xml", content: "<AxTable>..." },
    { filename: "SalesTable.xml", content: "<AxTable>..." },
    // ... up to 11k files
  ],
  replaceExisting: false  // true = clear DB first
}

Output: {
  success: true,
  tablesProcessed: 11000,
  created: 10500,
  replaced: 500,
  errors: []
}
```

**Key Features:**
- ✅ Batch processing (10 concurrent files at a time)
- ✅ Error resilience (Promise.allSettled catches individual errors)
- ✅ Progress logging to console
- ✅ Relationship inference built-in
- ✅ Method code extraction for future relationship refinement

### Required XML Format

The system expects D365 AxTable format:

```xml
<?xml version="1.0" encoding="utf-8"?>
<AxTable xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <Name>CustTable</Name>
  <Label>Customers</Label>
  <SourceCode>
    <Declaration>/// Customer master table</Declaration>
    <Methods>
      <AxSourceCodeProperty>
        <Name>accountNum</Name>
        <!-- ... -->
      </AxSourceCodeProperty>
    </Methods>
  </SourceCode>
  <Fields>
    <AxTableField>
      <Name>AccountNum</Name>
      <ExtendedDataType>CustAccount</ExtendedDataType>
      <Type>String</Type>
      <StringSize>20</StringSize>
    </AxTableField>
    <!-- ... more fields ... -->
  </Fields>
  <Relations>
    <AxTableRelation>
      <Name>CustGroup</Name>
      <RelatedTable>CustGroup</RelatedTable>
      <!-- ... -->
    </AxTableRelation>
    <!-- ... more relations ... -->
  </Relations>
</AxTable>
```

### Step-by-Step: Testing the Import

#### Test 1: Single File Test (5 minutes)

```typescript
// In browser console or via API testing tool:

const singleFile = [{
  filename: "CustTable.xml",
  content: `<?xml version="1.0"?>
<AxTable>
  <Name>CustTable</Name>
  <Fields>
    <AxTableField>
      <Name>AccountNum</Name>
      <Type>String</Type>
    </AxTableField>
  </Fields>
  <Relations></Relations>
</AxTable>`
}];

// POST to /api/trpc/metadata.uploadBulk
// Response should show: success: true, tablesProcessed: 1
```

#### Test 2: 100-File Batch (30 minutes)

1. Prepare 100 sample XML files
2. POST to uploadBulk
3. Monitor console logs for progress
4. Check response for errors
5. Query database: `SELECT COUNT(*) FROM metadata_tables;`

#### Test 3: Full 11k Import (1-2 hours)

1. Prepare all 11k XML files
2. POST to uploadBulk with replaceExisting: false
3. Monitor logs for progress updates
4. Final response shows total count

### Things to Monitor During Import

**1. File Size Check**
```bash
# Before import, estimate total data
du -sh /path/to/xml/files/

# Rule of thumb:
# - Average XML file: 50-100 KB
# - 11k files × 75 KB average = 825 MB
# - MySQL can handle this easily
```

**2. Import Progress**
- Check server logs for batch progress messages
- Look for error logs (errors are captured, import continues)
- Monitor database growth: `SELECT COUNT(*) FROM metadata_tables;`

**3. Database Space**
```sql
-- Check metadata storage after import
SELECT
  TABLE_NAME,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'your_db'
ORDER BY size_mb DESC;
```

**4. Success Criteria**
- ✅ response.success === true
- ✅ response.tablesProcessed >= 11000 (or your file count)
- ✅ No critical errors in response.errors
- ✅ Database shows all tables present

---

## PART 2: The Problem After Import (Why RAG Matters)

### The Token Budget Problem

After you import 11k tables, here's what happens in `queryGenerator.ts`:

```typescript
const tables = await db.getMetadataTables(); // Fetches ALL 11k tables

// Build context string with ALL metadata:
for (const table of tables) {  // Loop through 11,000 tables
  metadataContext += `## Table: ${table.tableName}\n`;

  // Add all fields for each table
  const fields = await db.getMetadataFieldsByTableId(table.id);
  for (const field of fields) {  // ~50 fields per table on average
    metadataContext += `  - ${field.fieldName} (${field.fieldType})\n`;
  }
}

// Result: metadataContext is HUGE
// ~5500 KB of text = ~1.1 million tokens = $15-30 per query ❌
```

**This is expensive and ineffective because:**

1. **Token explosion** - LLM can't focus on 11k tables at once
2. **Cost** - $15-30 per query = $150-300 for 10 user queries
3. **Accuracy** - LLM gets confused with too much irrelevant data
4. **Slowness** - Long context = slow LLM responses

### The Solution: Intelligent Metadata Retrieval

After bulk import, add a **metadata retrieval layer** that:

```typescript
// NEW: Find only relevant tables for this question
const relevantTables = await findRelevantMetadata(question, { limit: 50 });
// "show customer balance" → finds [CustTable, CustInvoiceJour, CustTrans, ...]

// INSTEAD OF: await db.getMetadataTables(); // ALL 11k
// DO THIS: await db.getMetadataTablesByIds(relevantTables); // Only 50

// Build context with ONLY relevant metadata
// ~1-2 KB of text = ~200-400 tokens = $0.30-0.60 per query ✅
```

---

## PART 3: RAG Integration (Week 2-3)

### What is Metadata RAG?

**RAG = Retrieval-Augmented Generation**

In your case:
1. **Retrieval** - Find most relevant tables to user's question
2. **Augmentation** - Add their field/relationship details to prompt
3. **Generation** - LLM generates SQL using augmented context

### Architecture

```
┌─────────────────────────────────────────────────┐
│ After Bulk Import: All 11k tables in DB          │
└─────────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────┐
│ Embedding Step (ONE TIME, ~5 minutes)           │
│                                                  │
│ For each table in DB:                            │
│   Input: "CustTable: Customer master table.      │
│           Fields: AccountNum, Name, Contact..."  │
│   ↓ (via embedding model)                       │
│   Output: Vector [0.12, 0.45, 0.33, ...]        │
│                                                  │
│ Store all 11k vectors in vector DB               │
└─────────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────┐
│ Query Time: Find Relevant Metadata (< 1 sec)    │
│                                                  │
│ User: "Show customer payment history"            │
│   ↓ (via embedding model)                       │
│   Vector: [0.10, 0.48, 0.31, ...]               │
│   ↓ (vector search)                             │
│   Top 50 similar tables returned                │
│ [CustTrans, CustInvoiceJour, CustTable, ...]    │
│                                                  │
│ Fetch only these 50 tables' fields from DB       │
└─────────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────┐
│ LLM Generation with Smart Context                │
│                                                  │
│ Context is now ~2 KB (50 tables) instead of      │
│ ~5500 KB (11k tables)                            │
│                                                  │
│ Cost: $0.30-0.60 vs $15-30 ✅                   │
│ Speed: 2-5 seconds vs 30+ seconds ✅            │
│ Accuracy: Much better focus ✅                  │
└─────────────────────────────────────────────────┘
```

### Vector Database Options (Pick One)

| Option | Cost | Setup Time | Pros | Cons |
|--------|------|-----------|------|------|
| **Chroma** | Free | 5 min | Embedded, no server | Limited to 1GB data |
| **Milvus** | Free | 30 min | Scalable, self-hosted | Docker required |
| **Pinecone** | $1-3/month | 2 min | Managed, easy API | Vendor lock-in |
| **Weaviate** | Free | 20 min | GraphQL API, flexible | Learning curve |
| **Supabase** (pgvector) | Free tier | 10 min | PostgreSQL + vectors | Requires Postgres |

**For your use case:** I'd recommend **Chroma** for MVP (easy) or **Supabase** for production (scalable).

### Embedding Model Options (Pick One)

| Model | Cost | Quality | Speed |
|-------|------|---------|-------|
| **OpenAI text-embedding-3-small** | $0.02 per 1M tokens | ⭐⭐⭐⭐⭐ Excellent | Fast |
| **Ollama (local)** | Free | ⭐⭐⭐ Good | Depends on hardware |
| **HuggingFace (free)** | Free | ⭐⭐⭐ Good | Slower |
| **All-MiniLM** (local) | Free | ⭐⭐⭐ Good | Very fast |

**For your use case:** **OpenAI** or **All-MiniLM locally** for reliability.

### Implementation Phases (Week 2-3)

#### Phase 2.1: Embedding Pipeline (Day 1-2)

Create new file: `server/metadata-rag-indexer.ts`

```typescript
import { getDb } from "./db";
import { getDefaultRAGOrchestrator } from "./rag/RAGOrchestrator";

/**
 * Create vector embeddings for all metadata tables
 * Run this ONCE after bulk import
 */
export async function indexMetadataForRAG() {
  const dbInstance = await getDb();
  const orchestrator = getDefaultRAGOrchestrator();

  // Get all tables from metadata
  const tables = await dbInstance
    .select()
    .from(metadataTables)
    .limit(11000);

  console.log(`Indexing ${tables.length} metadata tables...`);

  for (const table of tables) {
    // Get fields for this table
    const fields = await dbInstance
      .select()
      .from(metadataFields)
      .where(eq(metadataFields.tableId, table.id))
      .limit(100); // Most tables have < 100 fields

    // Create embedding text
    const embeddingText = `
      Table: ${table.tableName}
      Description: ${table.description || ''}
      Fields: ${fields.map(f => f.fieldName).join(', ')}
    `;

    // Create embedding
    const embedding = await createEmbedding(embeddingText);

    // Store in vector DB
    await orchestrator.addMetadataVector({
      id: `metadata_${table.id}`,
      tableId: table.id,
      tableName: table.tableName,
      vector: embedding,
      metadata: { type: 'metadata_table' }
    });
  }

  console.log('✅ Metadata indexing complete');
}
```

**To run after import:**
```bash
# Option 1: Via admin endpoint (add to routers-admin.ts)
POST /api/trpc/admin.indexMetadataForRAG

# Option 2: Via CLI
npx ts-node server/metadata-rag-indexer.ts
```

#### Phase 2.2: Metadata Search (Day 2-3)

Update file: `server/knowledge-base-adapter.ts`

```typescript
/**
 * Find relevant tables for a user question
 */
export async function findRelevantMetadataTables(
  question: string,
  options?: { limit?: number; minRelevance?: number }
): Promise<number[]> {
  const orchestrator = getDefaultRAGOrchestrator();

  // Search for relevant metadata
  const results = await orchestrator.search(question, {
    filter: { type: 'metadata_table' },
    limit: options?.limit || 50,
  });

  // Extract table IDs, sorted by relevance
  return results
    .filter(r => r.relevanceScore >= (options?.minRelevance || 0.3))
    .map(r => r.metadata.tableId);
}
```

#### Phase 2.3: Query Generation Integration (Day 3-4)

Update file: `server/queryGenerator.ts`

```typescript
// BEFORE:
const tables = await db.getMetadataTables();

// AFTER:
// 1. Find relevant tables via RAG
const relevantTableIds = await findRelevantMetadataTables(
  naturalLanguageQuery,
  { limit: 50, minRelevance: 0.3 }
);

// 2. Get details for only those tables
const tables = relevantTableIds.length > 0
  ? await db.getMetadataTablesByIds(relevantTableIds)
  : await db.getMetadataTables(); // Fallback if RAG fails

// Rest of the function stays the same...
```

#### Phase 2.4: Add Database Helper (Day 1)

Update file: `server/db.ts`

```typescript
/**
 * Get metadata tables by IDs
 * Used by RAG-based query generation
 */
export async function getMetadataTablesByIds(tableIds: number[]) {
  if (tableIds.length === 0) return [];

  return await db
    .select()
    .from(metadataTables)
    .where(inArray(metadataTables.id, tableIds));
}
```

---

## PART 4: Testing & Validation

### Test Scenarios After Integration

#### Scenario 1: Specific Table Query
**Question:** "Show me all customers with credit limit > 10000"
**Expected:** RAG finds CustTable, CreditLimit field

#### Scenario 2: Multi-Table Join
**Question:** "Show customers and their invoices with balance"
**Expected:** RAG finds CustTable + CustInvoiceJour + CustTrans

#### Scenario 3: Aggregation
**Question:** "Total sales by customer"
**Expected:** RAG finds SalesTable + SalesLine + Customer references

#### Scenario 4: Date Range Query
**Question:** "Invoices created in last 30 days"
**Expected:** RAG finds tables with date fields, createdDate patterns

### Performance Testing

```sql
-- After import, test metadata query performance
-- This should be < 100ms for 11k tables

SELECT COUNT(*) FROM metadata_tables; -- Should return ~11000
SELECT COUNT(*) FROM metadata_fields; -- Should return ~550000 (avg 50 fields/table)
SELECT COUNT(*) FROM table_relationships; -- Should return ~50000+ (avg 5 rels/table)

-- Test field lookup (this is called frequently)
SELECT COUNT(*) FROM metadata_fields WHERE tableId = 1; -- Should be instant

-- Test relationship lookups
SELECT * FROM table_relationships WHERE sourceTableId = 1; -- Should be instant
```

---

## PART 5: Recommended Next Steps

### Immediate (This Week)
1. ✅ **Read this document** - Understand the architecture
2. ✅ **Prepare XML files** - Get 11k metadata files ready
3. ✅ **Test uploadBulk endpoint** - Start with 10-100 files first
4. ✅ **Monitor import** - Watch console logs, verify database growth
5. ✅ **Validate results** - Query database for total table count

### Short Term (Next Week)
6. ⬜ **Plan RAG infrastructure** - Choose vector DB + embedding model
7. ⬜ **Create embedding pipeline** - Build metadata-rag-indexer.ts
8. ⬜ **Set up vector storage** - Initialize your chosen vector DB
9. ⬜ **Implement search function** - Add findRelevantMetadataTables()

### Medium Term (Week 3)
10. ⬜ **Integrate into query generation** - Update queryGenerator.ts
11. ⬜ **Add fallback logic** - Handle RAG failures gracefully
12. ⬜ **Test end-to-end** - Run sample queries through full pipeline
13. ⬜ **Optimize relevance** - Tune embedding and search parameters

### Long Term (Month 2+)
14. ⬜ **Monitor costs** - Track LLM token usage before/after RAG
15. ⬜ **Gather metrics** - Query success rate, generation time, cost per query
16. ⬜ **Refine embeddings** - Fine-tune model if accuracy issues found
17. ⬜ **Add analytics** - Dashboard for metadata usage patterns

---

## Quick Reference: Key Files to Modify

| File | Change | When |
|------|--------|------|
| `server/routers.ts` | ✅ Already has uploadBulk | Use NOW |
| `server/db.ts` | Add getMetadataTablesByIds() | Week 2 |
| `server/metadata-rag-indexer.ts` | **NEW** - Embedding pipeline | Week 2 |
| `server/knowledge-base-adapter.ts` | Extend with findRelevantMetadataTables() | Week 2 |
| `server/queryGenerator.ts` | Integrate RAG search | Week 3 |
| `drizzle/schema.ts` | ⚠️ May need vector metadata | Check Week 2 |

---

## Success Criteria

✅ **Import Complete When:**
- [x] All 11k XML files processed
- [x] Database shows 11k tables
- [x] 0-1% error rate (< 100 files failed)
- [x] Relationship inference complete

✅ **RAG Ready When:**
- [ ] All metadata embedded (11k vectors)
- [ ] Vector search returns relevant results
- [ ] Response time < 1 second for metadata search
- [ ] Sample queries return expected tables

✅ **Production Ready When:**
- [ ] LLM cost reduced by 10x
- [ ] Query generation speed improved
- [ ] Accuracy testing shows > 90% relevance
- [ ] Fallback logic handles failures

---

## Troubleshooting

### Problem: Upload fails partway through
**Solution:** uploadBulk uses Promise.allSettled, so failures are captured. Check logs for specific file errors, fix those files, run uploadBulk again with replaceExisting: false.

### Problem: Memory limit exceeded during import
**Solution:** Reduce MAX_CONCURRENT in uploadBulk from 10 to 5. Located in server/routers.ts around line 170.

### Problem: Vector search returns irrelevant results
**Solution:** This usually means the embedding model isn't D365-savvy. Solutions:
1. Use semantic naming in table descriptions (CustTable = "Customer Master Table")
2. Fine-tune embeddings on D365-specific corpus
3. Implement custom similarity scoring based on field names

### Problem: LLM still generates wrong SQL
**Solution:** Even with smart metadata, LLM can make mistakes. Add:
1. Query validation before execution
2. Explicit database schema in the prompt (not just metadata)
3. Few-shot examples of correct D365 queries
4. Human-in-the-loop approval for complex queries

---

## Resources

- **Existing RAGOrchestrator:** `/server/rag/RAGOrchestrator.ts` (study this first)
- **Metadata Parser:** `/server/metadataParserV2.ts` (understand XML structure)
- **Query Generator:** `/server/queryGenerator.ts` (where integration happens)
- **Knowledge Base Adapter:** `/server/knowledge-base-adapter.ts` (interface to extend)

